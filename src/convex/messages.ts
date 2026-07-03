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
      reason = "Message contained restricted content and was filtered for safety.";
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
    if (!booking) throw new Error("Booking not found");

    if (booking.helperId !== userId && booking.customerId !== userId) {
      throw new Error("Not part of this booking");
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      throw new Error("Chat is closed for this booking");
    }

    if (args.content.trim().length === 0) throw new Error("Message cannot be empty");
    if (args.content.length > 2000) throw new Error("Message too long");

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
    if (!booking) throw new Error("Booking not found");
    if (booking.helperId !== userId && booking.customerId !== userId) {
      throw new Error("Not part of this booking");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .order("asc")
      .collect();

    return messages;
  },
});
