import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./users";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateToken(): string {
  const chars = new Uint8Array(32);
  crypto.getRandomValues(chars);
  return Array.from(chars, (b) => alphabet[b % alphabet.length]).join("");
}

export const requestParentApproval = mutation({
  args: {
    parentEmail: v.string(),
    parentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role !== "helper") throw new Error("Only helpers can request parent approval");
    if (user.age !== undefined && user.age >= 18) {
      throw new Error("Only helpers under 18 need parent approval");
    }

    // Check existing approval
    const existing = await ctx.db
      .query("parentApprovals")
      .withIndex("by_child", (q) => q.eq("childId", userId))
      .filter((q) => q.eq(q.field("approved"), true))
      .first();
    if (existing) throw new Error("Parent approval already exists");

    const token = generateToken();
    const approvalId = await ctx.db.insert("parentApprovals", {
      childId: userId,
      parentEmail: args.parentEmail,
      parentName: args.parentName,
      approved: false,
      token,
      createdAt: Date.now(),
    });

    // Update user's parent email
    await ctx.db.patch(userId, {
      parentEmail: args.parentEmail,
    });

    return { approvalId, token };
  },
});

export const approveParentConsent = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const approval = await ctx.db
      .query("parentApprovals")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!approval) throw new Error("Invalid or expired approval link");
    if (approval.approved) throw new Error("Already approved");

    const now = Date.now();
    await ctx.db.patch(approval._id, {
      approved: true,
      approvedAt: now,
    });

    await ctx.db.patch(approval.childId, {
      parentApproved: true,
    });

    return { success: true };
  },
});

export const getParentApproval = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    return await ctx.db
      .query("parentApprovals")
      .withIndex("by_child", (q) => q.eq("childId", userId))
      .order("desc")
      .first();
  },
});

export const checkParentApprovalToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const approval = await ctx.db
      .query("parentApprovals")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!approval) return null;
    const child = await ctx.db.get(approval.childId);
    return { approval, childName: child?.name };
  },
});
