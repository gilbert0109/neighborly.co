import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./users";

export const setAvailability = mutation({
  args: {
    entries: v.array(
      v.object({
        dayOfWeek: v.number(),
        startTime: v.string(),
        endTime: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role !== "helper") throw new Error("Kun hjælpere kan angive tilgængelighed");

    // Delete existing availability
    const existing = await ctx.db
      .query("helperAvailability")
      .withIndex("by_helper", (q) => q.eq("helperId", userId))
      .collect();
    for (const entry of existing) {
      await ctx.db.delete(entry._id);
    }

    // Insert new availability
    for (const entry of args.entries) {
      if (entry.dayOfWeek < 0 || entry.dayOfWeek > 6) {
        throw new Error("Ugyldig ugedag");
      }
      await ctx.db.insert("helperAvailability", {
        helperId: userId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
      });
    }
  },
});

export const getAvailability = query({
  args: { helperId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("helperAvailability")
      .withIndex("by_helper", (q) => q.eq("helperId", args.helperId))
      .collect();
  },
});

export const getMyAvailability = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    return await ctx.db
      .query("helperAvailability")
      .withIndex("by_helper", (q) => q.eq("helperId", userId))
      .collect();
  },
});
