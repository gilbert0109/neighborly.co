import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./users";

/**
 * Helper updates their live location during an active booking.
 * Only works when the booking is in_progress.
 */
export const updateLocation = mutation({
  args: {
    bookingId: v.id("bookings"),
    location: v.object({ lat: v.number(), lng: v.number() }),
    heading: v.optional(v.number()),
    speed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role !== "helper") throw new Error("Kun hjælpere kan dele position");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking ikke fundet");
    if (booking.helperId !== userId) throw new Error("Ikke din booking");
    if (booking.status !== "in_progress") {
      throw new Error("Kan kun dele position under igangværende opgaver");
    }

    const existing = await ctx.db
      .query("helperLocations")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        location: args.location,
        heading: args.heading,
        speed: args.speed,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("helperLocations", {
        helperId: userId,
        bookingId: args.bookingId,
        location: args.location,
        heading: args.heading,
        speed: args.speed,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Customer gets the helper's live location for an active booking.
 */
export const getHelperLocation = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking ikke fundet");
    if (booking.customerId !== userId && booking.helperId !== userId) {
      throw new Error("Ikke en del af denne booking");
    }

    const loc = await ctx.db
      .query("helperLocations")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();

    if (!loc) return null;

    const helper = await ctx.db.get(loc.helperId);
    const job = await ctx.db.get(booking.jobId);

    return {
      ...loc,
      helperName: helper?.name ?? null,
      helperImage: helper?.image ?? null,
      jobAddress: job?.address ?? null,
      jobLocation: job?.location ?? null,
      bookingStatus: booking.status,
      scheduledDate: booking.scheduledDate,
    };
  },
});
