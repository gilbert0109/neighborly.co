import { v } from "convex/values";
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { requireUser } from "./users";
import { jobCategoryValidator } from "./schema";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateToken(): string {
  const chars = new Uint8Array(32);
  crypto.getRandomValues(chars);
  return Array.from(chars, (b) => alphabet[b % alphabet.length]).join("");
}

export async function requireParentApproval(
  ctx: QueryCtx | MutationCtx,
  childId: string,
): Promise<{ approval: any; child: any }> {
  const child = await ctx.db.get(childId as any);
  if (!child) throw new Error("Helper not found");

  // Type workaround — child is a generic document
  const childAny = child as any;

  if (childAny.age !== undefined && childAny.age >= 18) {
    return { approval: null, child };
  }

  const approval = await ctx.db
    .query("parentApprovals")
    .withIndex("by_child", (q) => q.eq("childId", childId as any))
    .filter((q) => q.eq(q.field("approved"), true))
    .first();

  if (!approval) throw new Error("Parent approval required");
  if (approval.paused) throw new Error("Parent approval is currently paused");
  if (approval.revokedAt) throw new Error("Parent approval has been revoked");

  return { approval, child };
}

/**
 * Validate that a job is safe for a minor worker.
 * Returns null if OK, or an error message string if blocked.
 */
export async function validateMinorWorkerJob(
  ctx: QueryCtx | MutationCtx,
  childId: string,
  job: any,
): Promise<string | null> {
  const child = await ctx.db.get(childId as any);
  if (!child) return "Helper not found";
  const childAny = child as any;
  if (childAny.age === undefined || childAny.age >= 18) return null; // Not a minor

  const { approval } = await requireParentApproval(ctx, childId);

  // Check category is allowed
  if (approval.allowedCategories && approval.allowedCategories.length > 0) {
    if (!approval.allowedCategories.includes(job.category)) {
      return "Denne opgavekategori er ikke godkendt af dine forældre";
    }
  }

  // Check distance
  if (approval.maxDistanceKm && job.location) {
    const d = haversine(
      childAny.location?.lat ?? 0,
      childAny.location?.lng ?? 0,
      job.location.lat,
      job.location.lng,
    );
    if (d > approval.maxDistanceKm) {
      return `Denne opgave er uden for den aftalte afstand (max ${approval.maxDistanceKm} km)`;
    }
  }

  return null;
}

/**
 * Check if the current time is within the helper's allowed working hours.
 * Returns null if OK, or an error message if blocked.
 */
export function checkWorkingHours(
  allowedStartTime: string | undefined,
  allowedEndTime: string | undefined,
): string | null {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;

  if (allowedStartTime) {
    const [sh, sm] = allowedStartTime.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    if (currentMinutes < startMinutes) {
      return `Du kan først arbejde fra kl. ${allowedStartTime}`;
    }
  }

  if (allowedEndTime) {
    const [eh, em] = allowedEndTime.split(":").map(Number);
    const endMinutes = eh * 60 + em;
    if (currentMinutes >= endMinutes) {
      return `Du kan ikke arbejde efter kl. ${allowedEndTime}`;
    }
  }

  return null;
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

    const existing = await ctx.db
      .query("parentApprovals")
      .withIndex("by_child", (q) => q.eq("childId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("approved"), true),
          q.eq(q.field("revokedAt"), undefined),
        ),
      )
      .first();
    if (existing) throw new Error("Parent approval already exists");

    const token = generateToken();
    const now = Date.now();
    const approvalId = await ctx.db.insert("parentApprovals", {
      childId: userId,
      parentEmail: args.parentEmail,
      parentName: args.parentName,
      approved: false,
      token,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(userId, { parentEmail: args.parentEmail });

    return { approvalId, token };
  },
});

export const approveParentConsent = mutation({
  args: {
    token: v.string(),
    allowedCategories: v.optional(v.array(jobCategoryValidator)),
    maxDistanceKm: v.optional(v.number()),
    allowedStartTime: v.optional(v.string()),
    allowedEndTime: v.optional(v.string()),
    perJobApproval: v.optional(v.boolean()),
    emergencyContactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db
      .query("parentApprovals")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!approval) throw new Error("Invalid or expired approval link");
    if (approval.approved) throw new Error("Already approved");
    if (approval.revokedAt) throw new Error("Approval has been revoked");

    const now = Date.now();
    await ctx.db.patch(approval._id, {
      approved: true,
      approvedAt: now,
      updatedAt: now,
      allowedCategories: args.allowedCategories,
      maxDistanceKm: args.maxDistanceKm,
      allowedStartTime: args.allowedStartTime,
      allowedEndTime: args.allowedEndTime,
      perJobApproval: args.perJobApproval,
      emergencyContactPhone: args.emergencyContactPhone,
    });

    await ctx.db.patch(approval.childId, { parentApproved: true });

    return { success: true };
  },
});

export const updateParentPermissions = mutation({
  args: {
    childId: v.id("users"),
    allowedCategories: v.optional(v.array(jobCategoryValidator)),
    maxDistanceKm: v.optional(v.number()),
    allowedStartTime: v.optional(v.string()),
    allowedEndTime: v.optional(v.string()),
    perJobApproval: v.optional(v.boolean()),
    emergencyContactPhone: v.optional(v.string()),
    paused: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const approval = await ctx.db
      .query("parentApprovals")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .filter((q) =>
        q.and(
          q.eq(q.field("approved"), true),
          q.eq(q.field("revokedAt"), undefined),
        ),
      )
      .first();
    if (!approval) throw new Error("No active parent approval found");

    // Parent can update via token link (using email), or child can request changes
    // For now, allow the parent (who created the approval) or admin
    const parentUser = await ctx.db.get(userId);
    if (parentUser?.role === "admin" || approval.childId === userId) {
      // OK
    } else {
      throw new Error("Not authorized to update permissions");
    }

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.allowedCategories !== undefined) patch.allowedCategories = args.allowedCategories;
    if (args.maxDistanceKm !== undefined) patch.maxDistanceKm = args.maxDistanceKm;
    if (args.allowedStartTime !== undefined) patch.allowedStartTime = args.allowedStartTime;
    if (args.allowedEndTime !== undefined) patch.allowedEndTime = args.allowedEndTime;
    if (args.perJobApproval !== undefined) patch.perJobApproval = args.perJobApproval;
    if (args.emergencyContactPhone !== undefined) patch.emergencyContactPhone = args.emergencyContactPhone;
    if (args.paused !== undefined) {
      patch.paused = args.paused;
      patch.pausedAt = args.paused ? now : undefined;
    }

    await ctx.db.patch(approval._id, patch);

    // If paused, also clear the user's parentApproved flag
    if (args.paused) {
      await ctx.db.patch(args.childId, { parentApproved: false });
    } else if (args.paused === false) {
      await ctx.db.patch(args.childId, { parentApproved: true });
    }
  },
});

export const revokeParentApproval = mutation({
  args: { childId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const approval = await ctx.db
      .query("parentApprovals")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .filter((q) =>
        q.and(
          q.eq(q.field("approved"), true),
          q.eq(q.field("revokedAt"), undefined),
        ),
      )
      .first();
    if (!approval) throw new Error("No active parent approval found");

    const parentUser = await ctx.db.get(userId);
    if (parentUser?.role !== "admin" && approval.childId !== userId) {
      throw new Error("Not authorized to revoke approval");
    }

    const now = Date.now();
    await ctx.db.patch(approval._id, {
      approved: false,
      revokedAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.childId, {
      parentApproved: false,
    });
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

export const getChildApproval = query({
  args: { childId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    // Check authorization: only the child themselves or an admin can view
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin" && args.childId !== userId) {
      throw new Error("Not authorized");
    }

    return await ctx.db
      .query("parentApprovals")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
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
    return {
      approval: {
        _id: approval._id,
        childId: approval.childId,
        parentEmail: approval.parentEmail,
        parentName: approval.parentName,
        approved: approval.approved,
        revokedAt: approval.revokedAt,
        allowedCategories: approval.allowedCategories,
        maxDistanceKm: approval.maxDistanceKm,
        allowedStartTime: approval.allowedStartTime,
        allowedEndTime: approval.allowedEndTime,
        perJobApproval: approval.perJobApproval,
        emergencyContactPhone: approval.emergencyContactPhone,
        paused: approval.paused,
        createdAt: approval.createdAt,
      },
      childName: child?.name,
      childAge: child?.age,
      childCity: child?.city,
    };
  },
});

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
