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
