import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser, requireRole } from "./users";
import { ROLES } from "./schema";

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.ADMIN]);
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const banUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireRole(ctx, [ROLES.ADMIN]);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();

    // Record the ban
    await ctx.db.insert("bannedUsers", {
      userId: args.userId,
      bannedBy: adminId,
      reason: args.reason,
      bannedAt: now,
      isActive: true,
    });

    // Update user
    await ctx.db.patch(args.userId, {
      banned: true,
      bannedAt: now,
      bannedReason: args.reason,
    });
  },
});

export const unbanUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireRole(ctx, [ROLES.ADMIN]);

    const activeBans = await ctx.db
      .query("bannedUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = Date.now();
    for (const ban of activeBans) {
      await ctx.db.patch(ban._id, { isActive: false, unbannedAt: now });
    }

    await ctx.db.patch(args.userId, {
      banned: undefined,
      bannedAt: undefined,
      bannedReason: undefined,
    });
  },
});

export const getBannedUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.ADMIN]);
    const bans = await ctx.db
      .query("bannedUsers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return await Promise.all(
      bans.map(async (b) => {
        const user = await ctx.db.get(b.userId);
        const bannedBy = await ctx.db.get(b.bannedBy);
        return { ...b, user, bannedBy };
      }),
    );
  },
});

export const getReports = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.ADMIN]);
    return await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

export const reviewReport = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(v.literal("reviewed"), v.literal("resolved"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.ADMIN]);
    await ctx.db.patch(args.reportId, {
      status: args.status,
      reviewedBy: userId,
      updatedAt: Date.now(),
    });
  },
});

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.ADMIN]);

    const users = await ctx.db.query("users").collect();
    const jobs = await ctx.db.query("jobs").collect();
    const bookings = await ctx.db.query("bookings").collect();
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const bans = await ctx.db
      .query("bannedUsers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return {
      totalUsers: users.length,
      helpers: users.filter((u) => u.role === "helper").length,
      customers: users.filter((u) => u.role === "customer").length,
      verifiedUsers: users.filter((u) => u.isVerified).length,
      pendingVerifications: users.filter((u) => u.verificationStatus === "pending").length,
      bannedUsers: bans.length,
      totalJobs: jobs.length,
      openJobs: jobs.filter((j) => j.status === "open").length,
      completedJobs: jobs.filter((j) => j.status === "completed").length,
      totalBookings: bookings.length,
      completedBookings: bookings.filter((b) => b.status === "completed").length,
      pendingReports: reports.length,
      totalRevenue: bookings
        .filter((b) => b.paymentStatus === "released")
        .reduce((s, b) => s + b.price, 0),
    };
  },
});

export const reportUser = mutation({
  args: {
    reportedUserId: v.id("users"),
    bookingId: v.optional(v.id("bookings")),
    reason: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("reports", {
      reporterId: userId,
      reportedUserId: args.reportedUserId,
      bookingId: args.bookingId,
      reason: args.reason,
      details: args.details,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createSafetyReport = mutation({
  args: {
    reportedUserId: v.id("users"),
    bookingId: v.optional(v.id("bookings")),
    reason: v.union(
      v.literal("grooming_attempt"),
      v.literal("off_platform_contact"),
      v.literal("cash_payment_request"),
      v.literal("unsafe_request"),
      v.literal("threatening_language"),
      v.literal("inappropriate_message"),
      v.literal("suspicious_customer"),
      v.literal("no_show"),
      v.literal("other"),
    ),
    details: v.optional(v.string()),
    messageContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("reports", {
      reporterId: userId,
      reportedUserId: args.reportedUserId,
      bookingId: args.bookingId,
      reason: args.reason,
      details: args.details
        ? args.details + (args.messageContent ? `\nBesked: ${args.messageContent}` : "")
        : args.messageContent
          ? `Besked: ${args.messageContent}`
          : undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listSafetyReportsForAdmin = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed"),
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.ADMIN]);

    let reports;
    if (args.status) {
      reports = await ctx.db
        .query("reports")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      reports = await ctx.db.query("reports").order("desc").collect();
    }

    return await Promise.all(
      reports.map(async (r) => {
        const reporter = await ctx.db.get(r.reporterId);
        const reportedUser = await ctx.db.get(r.reportedUserId);
        const booking = r.bookingId ? await ctx.db.get(r.bookingId) : null;
        const reviewer = r.reviewedBy ? await ctx.db.get(r.reviewedBy) : null;
        return {
          ...r,
          reporter: reporter
            ? { name: reporter.name, email: reporter.email, image: reporter.image }
            : null,
          reportedUser: reportedUser
            ? { name: reportedUser.name, email: reportedUser.email, role: reportedUser.role }
            : null,
          booking: booking
            ? { _id: booking._id, title: (booking as any).title, status: (booking as any).status }
            : null,
          reviewer: reviewer ? { name: reviewer.name } : null,
        };
      }),
    );
  },
});

export const resolveSafetyReport = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    action: v.optional(v.union(
      v.literal("warn_user"),
      v.literal("suspend_user"),
      v.literal("ban_user"),
      v.literal("no_action"),
    )),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.ADMIN]);
    const now = Date.now();

    await ctx.db.patch(args.reportId, {
      status: args.status,
      reviewedBy: userId,
      updatedAt: now,
    });

    // Take action if specified
    if (args.action === "warn_user") {
      // Could send notification to user
    }

    if (args.action === "suspend_user" || args.action === "ban_user") {
      const report = await ctx.db.get(args.reportId);
      if (report) {
        await ctx.db.insert("bannedUsers", {
          userId: report.reportedUserId,
          bannedBy: userId,
          reason: args.adminNote || `Safety report: ${report.reason}`,
          bannedAt: now,
          isActive: true,
        });
        await ctx.db.patch(report.reportedUserId, {
          banned: true,
          bannedAt: now,
          bannedReason: args.adminNote || `Safety report: ${report.reason}`,
        });
      }
    }
  },
});

export const suspendUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
    durationHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireRole(ctx, [ROLES.ADMIN]);
    const now = Date.now();

    await ctx.db.insert("bannedUsers", {
      userId: args.userId,
      bannedBy: adminId,
      reason: `Suspension: ${args.reason}`,
      bannedAt: now,
      isActive: true,
    });

    await ctx.db.patch(args.userId, {
      banned: true,
      bannedAt: now,
      bannedReason: `Suspension: ${args.reason}`,
    });
  },
});

/**
 * Calculate payout amounts for a booking.
 * customer pays 100%, platform keeps 20%, helper receives 80%.
 * Tips go 100% to helper.
 */
export function calculatePayout(
  priceMinorUnits: number,
  tipMinorUnits: number = 0,
): {
  platformFeeMinorUnits: number;
  workerPayoutMinorUnits: number;
  totalChargedMinorUnits: number;
} {
  const totalChargedMinorUnits = priceMinorUnits + tipMinorUnits;
  const platformFeeMinorUnits = Math.round(priceMinorUnits * 0.2);
  const workerPayoutMinorUnits =
    priceMinorUnits - platformFeeMinorUnits + tipMinorUnits;

  return {
    platformFeeMinorUnits,
    workerPayoutMinorUnits,
    totalChargedMinorUnits,
  };
}
