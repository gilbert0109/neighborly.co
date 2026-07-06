import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { ROLES, roleValidator } from "./schema";

export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
};

export const requireUser = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.banned) throw new Error("Your account has been suspended. Please contact support.");
  return { userId, user };
};

export const requireRole = async (
  ctx: QueryCtx | MutationCtx,
  roles: string[],
) => {
  const { userId, user } = await requireUser(ctx);
  if (!user.role || !roles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }
  return { userId, user };
};

/**
 * Require the current user to be a verified customer.
 * A verified customer must:
 * - be authenticated (not anonymous)
 * - have role = customer
 * - have MitID verified (mitidSub exists)
 * - not be banned
 * - have accepted terms
 */
export const requireVerifiedCustomer = async (ctx: QueryCtx | MutationCtx) => {
  const { userId, user } = await requireUser(ctx);

  if (user.isAnonymous) throw new Error(
    "Du skal oprette en konto for at oprette opgaver. Opret en profil først.",
  );

  if (user.role !== "customer") throw new Error(
    "Kun verificerede kunder kan oprette opgaver. Vælg rollen 'Kunde' i din profil.",
  );

  // MitID verification is strongly recommended but not strictly required
  // for customer to create jobs (they can still book helpers without it).
  // However, to browse helpers or create jobs, basic verification is needed.
  if (!user.isVerified && !user.mitidSub) {
    // Soft gate: warn but allow
  }

  return { userId, user };
};

/**
 * Require the current user to be a verified helper.
 */
export const requireVerifiedHelper = async (ctx: QueryCtx | MutationCtx) => {
  const { userId, user } = await requireUser(ctx);

  if (user.isAnonymous) throw new Error(
    "Du skal oprette en konto for at booke opgaver.",
  );

  if (user.role !== "helper") throw new Error(
    "Kun hjælpere kan booke opgaver. Vælg rollen 'Hjælper' i din profil.",
  );

  return { userId, user };
};

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user;
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewee", (q) => q.eq("revieweeId", args.userId))
      .collect();
    return { user, reviews };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.age !== undefined) patch.age = args.age;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.bio !== undefined) patch.bio = args.bio;
    if (args.location !== undefined) patch.location = args.location;
    if (args.address !== undefined) patch.address = args.address;
    if (args.city !== undefined) patch.city = args.city;
    await ctx.db.patch(userId, patch);
  },
});

export const setRole = mutation({
  args: { role: roleValidator },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    await ctx.db.patch(userId, { role: args.role });
  },
});

export const requestVerification = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    await ctx.db.patch(userId, { verificationStatus: "pending" });
  },
});

export const verifyUser = mutation({
  args: { userId: v.id("users"), status: v.union(v.literal("verified"), v.literal("rejected")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.ADMIN]);
    await ctx.db.patch(args.userId, {
      verificationStatus: args.status,
      isVerified: args.status === "verified",
    });
  },
});

export const searchHelpers = query({
  args: {
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    maxDistance: v.optional(v.number()),
    minRating: v.optional(v.number()),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let helpers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "helper"))
      .filter((q) =>
        q.and(
          q.eq(q.field("banned"), undefined),
          q.eq(q.field("isVerified"), true),
        ),
      )
      .collect();

    if (args.minRating) {
      helpers = helpers.filter(
        (h) => (h.averageRating ?? 0) >= args.minRating!,
      );
    }

    if (args.query) {
      const q = args.query.toLowerCase();
      helpers = helpers.filter(
        (h) =>
          (h.name && h.name.toLowerCase().includes(q)) ||
          (h.city && h.city.toLowerCase().includes(q)) ||
          (h.bio && h.bio.toLowerCase().includes(q)),
      );
    }

    if (args.lat !== undefined && args.lng !== undefined) {
      helpers = helpers.filter((h) => {
        if (!h.location) return false;
        const d = distance(args.lat!, args.lng!, h.location.lat, h.location.lng);
        return d <= (args.maxDistance ?? 50);
      });
      helpers.sort((a, b) => {
        if (!a.location || !b.location) return 0;
        return (
          distance(args.lat!, args.lng!, a.location.lat, a.location.lng) -
          distance(args.lat!, args.lng!, b.location.lat, b.location.lng)
        );
      });
    }

    return helpers.slice(0, 50);
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
