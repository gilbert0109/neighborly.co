import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./users";

// Patterns to filter from chat
const BLOCKED_PATTERNS = [
  /\b\d{8,}\b/, // Long number sequences (phone numbers)
  /\b\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/, // DK phone format
  /\b[\w.-]+@[\w.-]+\.\w+\b/, // Email addresses
  /\bhttps?:\/\/\S+\b/, // URLs
  /\bwww\.\S+\b/, // www links
  /@\w+/, // Social media handles
  /\b(indendørs|indendoers|indendors|indenfor|inside)\b/i, // Indoor keywords
  /\b(facebook|instagram|snapchat|whatsapp|telegram|signal|discord|messenger)\b/i, // Social platforms
  /\b(kontanter|cash|penge|mobilepay)\b/i, // Cash/payment keywords (Danish)
  /\b(meet me|meet at my|come to my|my house|my place|hjemme hos|hjemme)\b/i, // Meeting at home
];

export function filterMessage(content: string): { filtered: string; wasFiltered: boolean; reason?: string } {
  let filtered = content;
  let wasFiltered = false;
  let reason: string | undefined;

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(filtered)) {
      filtered = filtered.replace(pattern, (match) => "*".repeat(match.length));
      wasFiltered = true;
      reason = "Beskeden indeholdt begrænset indhold og blev filtreret af sikkerhedshensyn.";
    }
  }

  return { filtered, wasFiltered, reason };
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

    const { filtered, wasFiltered, reason } = filterMessage(args.content);

    return await ctx.db.insert("messages", {
      bookingId: args.bookingId,
      senderId: userId,
      receiverId,
      content: filtered,
      isFiltered: wasFiltered || undefined,
      filterReason: reason,
      createdAt: Date.now(),
    });
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
