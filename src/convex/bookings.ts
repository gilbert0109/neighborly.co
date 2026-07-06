import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { requireUser, requireRole, requireVerifiedHelper } from "./users";
import { ROLES } from "./schema";
import { internal } from "./_generated/api";
import { requireParentApproval, validateMinorWorkerJob, checkWorkingHours } from "./parentApprovals";

export const createBooking = mutation({
  args: {
    jobId: v.id("jobs"),
    scheduledDate: v.number(),
    customerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireVerifiedHelper(ctx);

    // Minor-worker safety rules
    if (user.age !== undefined && user.age < 18) {
      // Check parent approval + validate job against parent permissions
      if (job) {
        const error = await validateMinorWorkerJob(ctx, userId, job);
        if (error) throw new Error(error);
      }

      // Check working hours (from parent settings)
      const approval = await ctx.db
        .query("parentApprovals")
        .withIndex("by_child", (q) => q.eq("childId", userId))
        .filter((q) => q.eq(q.field("approved"), true))
        .first();

      if (approval) {
        if (approval.allowedStartTime || approval.allowedEndTime) {
          const hoursError = checkWorkingHours(
            approval.allowedStartTime ?? undefined,
            approval.allowedEndTime ?? undefined,
          );
          if (hoursError) throw new Error(hoursError);
        }
      }

      // Also check default 18:00-08:00 restriction
      const hour = new Date(args.scheduledDate).getHours();
      if (hour >= 18 || hour < 8) {
        throw new Error("Unge under 18 kan ikke arbejde mellem kl. 18:00 og 08:00. Vælg et tidspunkt mellem 08:00-18:00.");
      }
    }

    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Opgave ikke fundet");
    if (job.status !== "open") throw new Error("Opgaven er ikke tilgængelig");

    // Check for existing booking
    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
        ),
      )
      .first();
    if (existing) throw new Error("Opgaven har allerede en aktiv booking");

    const now = Date.now();

    // Update job status
    await ctx.db.patch(args.jobId, { status: "assigned", updatedAt: now });

    return await ctx.db.insert("bookings", {
      jobId: args.jobId,
      helperId: userId,
      customerId: job.customerId,
      status: "pending",
      scheduledDate: args.scheduledDate,
      price: job.price,
      paymentStatus: "pending",
      customerNotes: args.customerNotes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("accepted"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking ikke fundet");

    const isCustomer = booking.customerId === userId;
    const isHelper = booking.helperId === userId;
    if (!isCustomer && !isHelper && user.role !== "admin") {
      throw new Error("Ikke autoriseret");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = { status: args.status, updatedAt: now };

    // Customer accepts the booking
    if (args.status === "accepted" && isCustomer) {
      if (booking.status !== "pending") throw new Error("Kan kun acceptere afventende bookinger");
    }

    // Helper marks in progress
    if (args.status === "in_progress" && isHelper) {
      if (booking.status !== "accepted") throw new Error("Kan kun starte accepterede bookinger");

      // Minor-worker safety checks
      const helper = await ctx.db.get(booking.helperId);
      if (helper?.age !== undefined && helper.age < 18) {
        // Check parent approval is still active
        const approval = await ctx.db
          .query("parentApprovals")
          .withIndex("by_child", (q) => q.eq("childId", booking.helperId))
          .filter((q) => q.eq(q.field("approved"), true))
          .first();

        if (!approval) throw new Error("Forældregodkendelse er ikke længere aktiv");
        if (approval.revokedAt) throw new Error("Forældregodkendelse er blevet tilbagekaldt");
        if (approval.paused) throw new Error("Forældregodkendelse er sat på pause");

        // Check parent-defined working hours
        if (approval.allowedStartTime || approval.allowedEndTime) {
          const hoursError = checkWorkingHours(
            approval.allowedStartTime ?? undefined,
            approval.allowedEndTime ?? undefined,
          );
          if (hoursError) throw new Error(hoursError);
        }

        // Default 18:00-08:00 restriction
        const hour = new Date().getHours();
        if (hour >= 18 || hour < 8) {
          throw new Error("Unge under 18 kan ikke arbejde mellem kl. 18:00 og 08:00. Vent til efter kl. 08:00.");
        }
      }
    }

    // Either party marks completed
    if (args.status === "completed") {
      if (booking.status !== "in_progress") throw new Error("Kan kun fuldføre igangværende bookinger");
      // Update job status
      await ctx.db.patch(booking.jobId, { status: "completed", updatedAt: now });
      // Increment completed jobs counter
      const helper = await ctx.db.get(booking.helperId);
      if (helper) {
        await ctx.db.patch(booking.helperId, {
          completedJobs: (helper.completedJobs ?? 0) + 1,
        });
      }
    }

    if (args.status === "cancelled") {
      // Reopen the job
      await ctx.db.patch(booking.jobId, { status: "open", updatedAt: now });
    }

    await ctx.db.patch(args.bookingId, updates);
  },
});

export const getMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);

    let bookings;
    if (user.role === "helper") {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_helper", (q) => q.eq("helperId", userId))
        .order("desc")
        .collect();
    } else {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_customer", (q) => q.eq("customerId", userId))
        .order("desc")
        .collect();
    }

    return await Promise.all(
      bookings.map(async (b) => {
        const job = await ctx.db.get(b.jobId);
        const helper = await ctx.db.get(b.helperId);
        const customer = await ctx.db.get(b.customerId);
        return { ...b, job, helper, customer };
      }),
    );
  },
});

export const getBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking ikke fundet");
    if (booking.helperId !== userId && booking.customerId !== userId) {
      const u = await ctx.db.get(userId);
      if (!u?.role || u.role !== "admin") throw new Error("Ikke autoriseret");
    }
    const job = await ctx.db.get(booking.jobId);
    const helper = await ctx.db.get(booking.helperId);
    const customer = await ctx.db.get(booking.customerId);
    return { ...booking, job, helper, customer };
  },
});

export const setPaymentIntent = mutation({
  args: {
    bookingId: v.id("bookings"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking ikke fundet");
    if (booking.customerId !== userId) throw new Error("Ikke din booking");
    await ctx.db.patch(args.bookingId, {
      stripePaymentIntentId: args.paymentIntentId,
      paymentStatus: "held",
    });
  },
});

export const releasePayment = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.ADMIN]);
    await ctx.db.patch(args.bookingId, { paymentStatus: "released" });
  },
});
