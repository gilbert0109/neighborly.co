import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const ROLES = {
  ADMIN: "admin",
  CUSTOMER: "customer",
  HELPER: "helper",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.CUSTOMER),
  v.literal(ROLES.HELPER),
);
export type Role = Infer<typeof roleValidator>;

// Only safe outdoor job categories allowed in MVP
// No indoor, no transport, no private-home categories
export const JOB_CATEGORIES = [
  "lawn-mowing",
  "gardening",
  "dog-walking",
  "snow-shoveling",
  "car-washing",
  "leaf-raking",
  "outdoor-help",
  "other-outdoor",
] as const;

export const jobCategoryValidator = v.union(
  ...JOB_CATEGORIES.map((c) => v.literal(c)),
);
export type JobCategory = Infer<typeof jobCategoryValidator>;

export const BOOKING_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
] as const;

export const bookingStatusValidator = v.union(
  ...BOOKING_STATUSES.map((s) => v.literal(s)),
);
export type BookingStatus = Infer<typeof bookingStatusValidator>;

export const PAYMENT_STATUSES = [
  "pending",
  "held",
  "released",
  "refunded",
] as const;

export const paymentStatusValidator = v.union(
  ...PAYMENT_STATUSES.map((s) => v.literal(s)),
);

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),

      // Neighborly-specific fields
      age: v.optional(v.number()),
      phone: v.optional(v.string()),
      bio: v.optional(v.string()),
      location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      isVerified: v.optional(v.boolean()),
      verificationStatus: v.optional(
        v.union(
          v.literal("unverified"),
          v.literal("pending"),
          v.literal("verified"),
          v.literal("rejected"),
        ),
      ),
      // MitID identity verification (Danish national eID)
      mitidSub: v.optional(v.string()),
      mitidName: v.optional(v.string()),
      mitidVerifiedAt: v.optional(v.number()),
      mitidAssuranceLevel: v.optional(
        v.union(v.literal("substantial"), v.literal("high")),
      ),
      parentApproved: v.optional(v.boolean()),
      parentEmail: v.optional(v.string()),
      banned: v.optional(v.boolean()),
      bannedAt: v.optional(v.number()),
      bannedReason: v.optional(v.string()),
      averageRating: v.optional(v.number()),
      totalReviews: v.optional(v.number()),
      completedJobs: v.optional(v.number()),
      stripeCustomerId: v.optional(v.string()),
    })
      .index("email", ["email"])
      .index("by_role", ["role"])
      .index("by_verification", ["verificationStatus"])
      .index("by_banned", ["banned"])
      .index("by_mitid_sub", ["mitidSub"]),

    jobs: defineTable({
      customerId: v.id("users"),
      title: v.string(),
      description: v.string(),
      category: jobCategoryValidator,
      price: v.number(), // in cents (DKK øre)
      location: v.object({ lat: v.number(), lng: v.number() }),
      address: v.string(),
      city: v.optional(v.string()),
      scheduledDate: v.optional(v.number()),
      status: v.union(
        v.literal("open"),
        v.literal("assigned"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
      imageUrl: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_customer", ["customerId"])
      .index("by_status", ["status"])
      .index("by_category", ["category"])
      .index("by_city", ["city"]),

    bookings: defineTable({
      jobId: v.id("jobs"),
      helperId: v.id("users"),
      customerId: v.id("users"),
      status: bookingStatusValidator,
      scheduledDate: v.number(),
      price: v.number(),
      stripePaymentIntentId: v.optional(v.string()),
      paymentStatus: paymentStatusValidator,
      customerNotes: v.optional(v.string()),
      helperNotes: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_job", ["jobId"])
      .index("by_helper", ["helperId"])
      .index("by_customer", ["customerId"])
      .index("by_status", ["status"])
      .index("by_payment", ["paymentStatus"]),

    reviews: defineTable({
      bookingId: v.id("bookings"),
      reviewerId: v.id("users"),
      revieweeId: v.id("users"),
      role: v.union(v.literal("customer"), v.literal("helper")),
      rating: v.number(), // 1-5
      comment: v.string(),
      createdAt: v.number(),
    })
      .index("by_reviewee", ["revieweeId"])
      .index("by_booking", ["bookingId"])
      .index("by_reviewer", ["reviewerId"]),

    helperAvailability: defineTable({
      helperId: v.id("users"),
      dayOfWeek: v.number(), // 0=Sunday, 6=Saturday
      startTime: v.string(), // "HH:MM" format
      endTime: v.string(),
    }).index("by_helper", ["helperId"]),

    helperLocations: defineTable({
      helperId: v.id("users"),
      bookingId: v.id("bookings"),
      location: v.object({ lat: v.number(), lng: v.number() }),
      heading: v.optional(v.number()),
      speed: v.optional(v.number()),
      updatedAt: v.number(),
    })
      .index("by_helper", ["helperId"])
      .index("by_booking", ["bookingId"]),

    messages: defineTable({
      bookingId: v.id("bookings"),
      senderId: v.id("users"),
      receiverId: v.id("users"),
      content: v.string(),
      isFiltered: v.optional(v.boolean()),
      filterReason: v.optional(v.string()),
      isRead: v.optional(v.boolean()),
      createdAt: v.number(),
    })
      .index("by_booking", ["bookingId"])
      .index("by_sender", ["senderId"]),

    parentApprovals: defineTable({
      childId: v.id("users"),
      parentEmail: v.string(),
      parentName: v.optional(v.string()),
      approved: v.boolean(),
      approvedAt: v.optional(v.number()),
      revokedAt: v.optional(v.number()),
      allowedCategories: v.optional(v.array(jobCategoryValidator)),
      maxDistanceKm: v.optional(v.number()),
      allowedStartTime: v.optional(v.string()), // "HH:MM" format
      allowedEndTime: v.optional(v.string()),   // "HH:MM" format
      perJobApproval: v.optional(v.boolean()),
      emergencyContactPhone: v.optional(v.string()),
      paused: v.optional(v.boolean()),
      pausedAt: v.optional(v.number()),
      token: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_child", ["childId"])
      .index("by_token", ["token"]),

    bannedUsers: defineTable({
      userId: v.id("users"),
      bannedBy: v.id("users"),
      reason: v.string(),
      bannedAt: v.number(),
      unbannedAt: v.optional(v.number()),
      isActive: v.boolean(),
    })
      .index("by_user", ["userId"])
      .index("by_active", ["isActive"]),

    reports: defineTable({
      reporterId: v.id("users"),
      reportedUserId: v.id("users"),
      bookingId: v.optional(v.id("bookings")),
      reason: v.string(),
      details: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("resolved"),
        v.literal("dismissed"),
      ),
      reviewedBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_reported", ["reportedUserId"])
      .index("by_status", ["status"]),

    termsAcceptance: defineTable({
      userId: v.id("users"),
      acceptedAt: v.number(),
      version: v.string(),
    }).index("by_user", ["userId"]),

    mitidVerifications: defineTable({
      userId: v.id("users"),
      state: v.string(), // CSRF protection nonce
      nonce: v.string(), // ID token nonce (replay protection)
      codeVerifier: v.string(), // PKCE verifier
      codeChallenge: v.string(), // SHA256(codeVerifier) base64url-encoded
      redirectUri: v.string(),
      mode: v.union(v.literal("sandbox"), v.literal("production")),
      createdAt: v.number(),
      expiresAt: v.number(), // ~5 minutes
      isConsumed: v.optional(v.boolean()),
      consumedAt: v.optional(v.number()),
    }).index("by_state", ["state"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
