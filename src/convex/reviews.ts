import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser, requireRole } from "./users";
import { ROLES } from "./schema";

export const createReview = mutation({
  args: {
    bookingId: v.id("bookings"),
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "completed") throw new Error("Can only review completed bookings");

    const isCustomer = booking.customerId === userId;
    const isHelper = booking.helperId === userId;
    if (!isCustomer && !isHelper) throw new Error("Not part of this booking");

    if (args.rating < 1 || args.rating > 5) throw new Error("Rating must be 1-5");

    // Check for duplicate
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .filter((q) => q.eq(q.field("reviewerId"), userId))
      .first();
    if (existing) throw new Error("You've already reviewed this booking");

    const revieweeId = isCustomer ? booking.helperId : booking.customerId;
    const role = isCustomer ? "customer" : "helper";

    const reviewId = await ctx.db.insert("reviews", {
      bookingId: args.bookingId,
      reviewerId: userId,
      revieweeId,
      role,
      rating: args.rating,
      comment: args.comment,
      createdAt: Date.now(),
    });

    // Update average rating
    const allReviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewee", (q) => q.eq("revieweeId", revieweeId))
      .collect();
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;

    await ctx.db.patch(revieweeId, {
      averageRating: Math.round(avg * 10) / 10,
      totalReviews: allReviews.length,
    });

    return reviewId;
  },
});

export const getUserReviews = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewee", (q) => q.eq("revieweeId", args.userId))
      .order("desc")
      .collect();

    return await Promise.all(
      reviews.map(async (r) => {
        const reviewer = await ctx.db.get(r.reviewerId);
        const booking = await ctx.db.get(r.bookingId);
        return { ...r, reviewer, booking };
      }),
    );
  },
});

export const getBookingReview = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const review = await ctx.db
      .query("reviews")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .filter((q) => q.eq(q.field("reviewerId"), userId))
      .first();
    return review;
  },
});
