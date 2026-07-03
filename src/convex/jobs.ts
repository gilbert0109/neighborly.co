import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser, requireRole } from "./users";
import { ROLES, jobCategoryValidator, JOB_CATEGORIES } from "./schema";

export const listJobs = query({
  args: {
    status: v.optional(v.string()),
    category: v.optional(jobCategoryValidator),
    city: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    maxDistance: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use a single full table scan with order, then filter in memory.
    // This avoids the type-incompatible chaining of withIndex on different indexes.
    let jobs = await ctx.db.query("jobs").order("desc").collect();

    // Filter by status (default: open only)
    if (args.status) {
      jobs = jobs.filter((j) => j.status === args.status);
    } else {
      jobs = jobs.filter((j) => j.status === "open");
    }

    // Filter by category
    if (args.category) {
      jobs = jobs.filter((j) => j.category === args.category);
    }

    // Filter by city
    if (args.city) {
      jobs = jobs.filter((j) => j.city === args.city);
    }

    // Distance filter and sort
    if (args.lat !== undefined && args.lng !== undefined) {
      jobs = jobs.filter((j) => {
        const d = distance(args.lat!, args.lng!, j.location.lat, j.location.lng);
        return d <= (args.maxDistance ?? 50);
      });
      jobs.sort((a, b) => {
        return (
          distance(args.lat!, args.lng!, a.location.lat, a.location.lng) -
          distance(args.lat!, args.lng!, b.location.lat, b.location.lng)
        );
      });
    }

    return jobs.slice(0, args.limit ?? 50);
  },
});

export const getJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const customer = await ctx.db.get(job.customerId);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
    return { job, customer, bookings };
  },
});

export const getMyJobs = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role === "customer") {
      return await ctx.db
        .query("jobs")
        .withIndex("by_customer", (q) => q.eq("customerId", userId))
        .order("desc")
        .collect();
    }
    // For helpers, get jobs they've booked
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_helper", (q) => q.eq("helperId", userId))
      .collect();
    const jobIds = [...new Set(bookings.map((b) => b.jobId))];
    const jobs = await Promise.all(jobIds.map((id) => ctx.db.get(id)));
    return jobs.filter(Boolean);
  },
});

export const createJob = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: jobCategoryValidator,
    price: v.number(),
    location: v.object({ lat: v.number(), lng: v.number() }),
    address: v.string(),
    city: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role !== "customer" && user.role !== "admin") {
      throw new Error("Only verified customers can post jobs");
    }
    if (!user.isVerified) {
      throw new Error("Only verified customers can post jobs");
    }

    const now = Date.now();
    return await ctx.db.insert("jobs", {
      customerId: userId,
      title: args.title,
      description: args.description,
      category: args.category,
      price: args.price,
      location: args.location,
      address: args.address,
      city: args.city,
      scheduledDate: args.scheduledDate,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateJob = mutation({
  args: {
    jobId: v.id("jobs"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    status: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");
    if (job.customerId !== userId) throw new Error("Not your job");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.price !== undefined) patch.price = args.price;
    if (args.status !== undefined) patch.status = args.status;
    if (args.scheduledDate !== undefined) patch.scheduledDate = args.scheduledDate;
    await ctx.db.patch(args.jobId, patch);
  },
});

export const deleteJob = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");
    if (job.customerId !== userId) throw new Error("Not your job");
    if (job.status !== "open" && job.status !== "cancelled") {
      throw new Error("Can only delete open or cancelled jobs");
    }
    await ctx.db.delete(args.jobId);
  },
});

export const getCategories = query({
  args: {},
  handler: async () => {
    return JOB_CATEGORIES.map((cat) => ({
      value: cat,
      label: cat
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    }));
  },
});

function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
