import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./users";
import { internal } from "./_generated/api";

// Patterns for blocked content (masked but delivered with warning)
const BLOCKED_PATTERNS = [
  /\b\d{8,}\b/, // Long number sequences (phone numbers)
  /\b\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/, // DK phone format
  /\b[\w.-]+@[\w.-]+\.\w+\b/, // Email addresses
  /\bhttps?:\/\/\S+\b/, // URLs
  /\bwww\.\S+\b/, // www links
  /@\w+/, // Social media handles
  /\b(indendørs|indendoers|indendors|indenfor|inside)\b/i,
  /\b(facebook|instagram|snapchat|whatsapp|telegram|signal|discord|messenger)\b/i,
  /\b(kontanter|cash|penge|mobilepay|paypal|swish|vipps|venmo|zelle)\b/i,
  /\b(meet me|meet at my|come to my|my house|my place|hjemme hos|hjemme)\b/i,
  /\b(send photo|send picture|send a photo|send a picture|send billede)\b/i,
];

// Severe grooming patterns — message is BLOCKED (not delivered), report created
const SEVERE_PATTERNS = [
  /\b(don'?t tell your parents|do not tell your parents)\b/i,
  /\b(keep this secret|keep this between us)\b/i,
  /\b(come alone|are you alone|kom alene|er du alene)\b/i,
  /\b(send me a photo|send me a picture|send mig et billede)\b/i,
  /\b(meet me somewhere else|mød mig et andet sted)\b/i,
  /\b(text me|call me|ring til mig|sms mig)\b/i,
  /\b(outside the app|uden for appen|udenfor appen)\b/i,
  /\b(different address|anden adresse|andet sted)\b/i,
];

export interface FilterResult {
  blocked: boolean;
  severe: boolean;
  reason: string;
  matchedPattern?: string;
}

/**
 * Filter a chat message and return whether it's blocked or masked.
 * - Normal blocked content: message is masked (stars), delivered, warning shown
 * - Severe grooming content: message is blocked entirely, report created
 */
export function filterMessage(content: string): FilterResult {
  // First check severe patterns
  for (const pattern of SEVERE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      return {
        blocked: true,
        severe: true,
        reason: "Beskeden indeholder indhold, der ikke er tilladt. Sikkerhedsrapport oprettet.",
        matchedPattern: match[0],
      };
    }
  }

  // Then check normal blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      return {
        blocked: true,
        severe: false,
        reason: "Beskeden indeholdt begrænset indhold og blev blokeret af sikkerhedshensyn.",
        matchedPattern: match[0],
      };
    }
  }

  return {
    blocked: false,
    severe: false,
    reason: "",
  };
}

export const sendMessage = mutation({
  args: {
    bookingId: v.id("bookings"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking ikke fundet");

    if (booking.helperId !== userId && booking.customerId !== userId) {
      throw new Error("Ikke en del af denne booking");
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      throw new Error("Chatten er lukket for denne booking");
    }

    if (args.content.trim().length === 0) throw new Error("Beskeden må ikke være tom");
    if (args.content.length > 2000) throw new Error("Beskeden er for lang");

    const receiverId =
      booking.customerId === userId ? booking.helperId : booking.customerId;

    const { blocked, severe, reason, matchedPattern } = filterMessage(args.content);

    if (blocked && severe) {
      // Severe: message is NOT delivered, safety report is created via scheduler
      // (scheduler survives atomic mutation rollback from the throw below)
      const now = Date.now();

      await ctx.scheduler.runAfter(0, (internal as any).admin.createSafetyReport, {
        reportedUserId: userId,
        bookingId: args.bookingId,
        reason: "grooming_attempt",
        details: `Alvorlig besked blokeret. Mønster: ${matchedPattern || "ukendt"}. Besked: ${args.content.substring(0, 200)}`,
        messageContent: args.content,
      });

      await ctx.db.insert("messages", {
        bookingId: args.bookingId,
        senderId: userId,
        receiverId,
        content: args.content,
        isFiltered: true,
        filterReason: reason,
        createdAt: now,
      });

      throw new Error(
        "Beskeden blev blokeret af sikkerhedshensyn. Rapporten er sendt til vores team.",
      );
    }

    // Normal blocked content: mask and deliver
    const filteredContent = blocked
      ? args.content.replace(
          new RegExp(matchedPattern?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "", "gi"),
          (match) => "*".repeat(match.length),
        )
      : args.content;

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      bookingId: args.bookingId,
      senderId: userId,
      receiverId,
      content: filteredContent,
      isFiltered: blocked ? true : undefined,
      filterReason: blocked ? reason : undefined,
      createdAt: now,
    });

    // If blocked (non-severe), log a blocked message record for admin review
    if (blocked) {
      await ctx.db.insert("reports", {
        reporterId: userId,
        reportedUserId: userId,
        bookingId: args.bookingId,
        reason: `off_platform_contact`,
        details: `Blokeret indhold. Mønster: ${matchedPattern || "ukendt"}. Besked: ${args.content.substring(0, 200)}`,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    return messageId;
  },
});

export const getMessages = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking ikke fundet");
    if (booking.helperId !== userId && booking.customerId !== userId) {
      throw new Error("Ikke en del af denne booking");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .order("asc")
      .collect();

    return messages;
  },
});

export const getMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);

    let bookings;
    if (user.role === "helper") {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_helper", (q) => q.eq("helperId", userId))
        .order("desc")
        .collect();
    } else {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_customer", (q) => q.eq("customerId", userId))
        .order("desc")
        .collect();
    }

    const conversations = await Promise.all(
      bookings.map(async (b) => {
        const job = await ctx.db.get(b.jobId);
        const otherPersonId =
          b.customerId === userId ? b.helperId : b.customerId;
        const otherPerson = await ctx.db.get(otherPersonId);

        // Get latest message for preview
        const latestMessages = await ctx.db
          .query("messages")
          .withIndex("by_booking", (q) => q.eq("bookingId", b._id))
          .order("desc")
          .take(1);

        // Count unread messages (sent to current user, not by current user)
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_booking", (q) => q.eq("bookingId", b._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("receiverId"), userId),
              q.eq(q.field("isRead"), undefined),
            ),
          )
          .collect();

        return {
          booking: b,
          job: job
            ? { title: job.title, category: job.category, address: job.address, city: job.city }
            : null,
          otherPerson: otherPerson
            ? { name: otherPerson.name, image: otherPerson.image, averageRating: otherPerson.averageRating }
            : null,
          latestMessage: latestMessages[0] ?? null,
          unreadCount: unreadMessages.length,
        };
      }),
    );

    // Sort: conversations with unread messages first, then by latest message time
    conversations.sort((a, b) => {
      const aUnread = a.unreadCount > 0 ? 1 : 0;
      const bUnread = b.unreadCount > 0 ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      const aTime = a.latestMessage?.createdAt ?? a.booking.createdAt;
      const bTime = b.latestMessage?.createdAt ?? b.booking.createdAt;
      return bTime - aTime;
    });

    return conversations;
  },
});

export const markAsRead = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking ikke fundet");
    if (booking.helperId !== userId && booking.customerId !== userId) {
      throw new Error("Ikke en del af denne booking");
    }

    const unread = await ctx.db
      .query("messages")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .filter((q) =>
        q.and(
          q.eq(q.field("receiverId"), userId),
          q.eq(q.field("isRead"), undefined),
        ),
      )
      .collect();

    await Promise.all(
      unread.map((msg) => ctx.db.patch(msg._id, { isRead: true })),
    );
  },
});

export const getTotalUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);

    let bookings;
    if (user.role === "helper") {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_helper", (q) => q.eq("helperId", userId))
        .collect();
    } else {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_customer", (q) => q.eq("customerId", userId))
        .collect();
    }

    const counts = await Promise.all(
      bookings.map(async (b) => {
        const unread = await ctx.db
          .query("messages")
          .withIndex("by_booking", (q) => q.eq("bookingId", b._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("receiverId"), userId),
              q.eq(q.field("isRead"), undefined),
            ),
          )
          .collect();
        return unread.length;
      }),
    );

    return counts.reduce((sum, c) => sum + c, 0);
  },
});
