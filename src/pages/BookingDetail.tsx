import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Star,
  User,
  MessageSquare,
  MapPin,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { SafeChatInput } from "@/components/safe-chat-input";
import { BookingTimeline } from "@/components/booking-timeline";
import { WorkerTrustCard } from "@/components/worker-trust-card";
import { SafetyBadge, SafetyBadgeGroup } from "@/components/safety-badge";
import { JobRiskCard } from "@/components/job-risk-card";
import { SOSButton } from "@/components/sos-button";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

export default function BookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookingData = useQuery(
    api.bookings.getBooking,
    bookingId ? { bookingId: bookingId as any } : "skip"
  );
  const rawMessages = useQuery(
    api.messages.getMessages,
    bookingId ? { bookingId: bookingId as any } : "skip"
  );
  const messages = rawMessages || [];

  const updateStatus = useMutation(api.bookings.updateBookingStatus);
  const sendMessage = useMutation(api.messages.sendMessage);
  const createReview = useMutation(api.reviews.createReview);
  const createSafetyReport = useMutation(api.admin.createSafetyReport);
  const bookingReview = useQuery(
    api.reviews.getBookingReview,
    bookingId ? { bookingId: bookingId as any } : "skip"
  );
  const bookingReviews = useQuery(
    api.reviews.getBookingReviews,
    bookingId ? { bookingId: bookingId as any } : "skip"
  );

  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const convex = useConvex();

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (bookingId && rawMessages && rawMessages.length > 0) {
      const hasUnread = rawMessages.some(
        (msg: any) => msg.receiverId === user?._id && !msg.isRead
      );
      if (hasUnread) {
        convex.mutation(api.messages.markAsRead, {
          bookingId: bookingId as any,
        });
      }
    }
  }, [bookingId, rawMessages, user?._id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (bookingData === undefined) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  if (bookingData === null || !("job" in bookingData)) {
    return (
      <DashboardLayout>
        <Card className="border border-border max-w-2xl">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">Booking ikke fundet</p>
            <Button onClick={() => navigate("/bookings")} variant="link" className="mt-2">
              Tilbage til bookinger
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { job, helper, customer } = bookingData;
  const isHelper = user?._id === bookingData.helperId;
  const isCustomer = user?._id === bookingData.customerId;
  const otherPerson = isHelper ? customer : helper;

  const handleStatusUpdate = async (status: "accepted" | "in_progress" | "completed" | "cancelled") => {
    try {
      await updateStatus({ bookingId: bookingId as any, status });
      toast.success(`${STATUS_LABELS[status] || status}`);
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke opdatere status");
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage({
        bookingId: bookingId as any,
        content,
      });
    } catch (e: any) {
      throw e;
    }
  };

  const handleReview = async () => {
    if (rating === 0) {
      toast.error("Vælg en bedømmelse");
      return;
    }
    setIsReviewing(true);
    try {
      await createReview({
        bookingId: bookingId as any,
        rating,
        comment: reviewComment,
      });
      toast.success("Anmeldelse sendt!");
      setRating(0);
      setReviewComment("");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke sende anmeldelse");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSafetyReport = async (type: "safety" | "emergency") => {
    if (type === "emergency") {
      window.open("tel:112");
      return;
    }
    try {
      await createSafetyReport({
        reason: "unsafe_request",
        details: `Sikkerhedsrapport vedr. booking ${bookingId}`,
        reportedUserId: otherPerson?._id as any,
        bookingId: bookingId as any,
      });
      toast.success("Sikkerhedsrapport oprettet");
    } catch (e: any) {
      toast.error("Kunne ikke oprette rapport");
    }
  };

  const canChat =
    bookingData.status !== "cancelled" &&
    bookingData.status !== "completed";

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate("/bookings")}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Tilbage til bookinger
        </button>

        {/* Booking info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold">
                    {job?.title || "Opgave"}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className={`border ${STATUS_COLORS[bookingData.status] || ""}`}>
                      {STATUS_LABELS[bookingData.status] || bookingData.status}
                    </Badge>
                    <Badge variant="secondary" className="border border-border">
                      {bookingData.paymentStatus}
                    </Badge>
                  </div>
                </div>
                <p className="text-2xl font-bold shrink-0">
                  {bookingData.price} kr
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Safety badges */}
              <SafetyBadgeGroup
                variants={[
                  ...(customer?.isVerified ? ["customer-verified" as const] : []),
                  "payment-secured" as const,
                  ...(job?.category && ["lawn-mowing", "gardening", "dog-walking", "snow-shoveling", "car-washing", "leaf-raking", "outdoor-help", "other-outdoor"].includes(job.category)
                    ? ["outdoor-only" as const]
                    : []),
                ]}
              />

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Planlagt</p>
                  <p className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(bookingData.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
                {job?.address && (
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Adresse</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {job.address}
                      {job.city ? `, ${job.city}` : ""}
                    </p>
                  </div>
                )}
              </div>

              {/* Other person */}
              <div className="border-t border-border/50 pt-4">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <User className="size-4" />
                  {isHelper ? "Kunde" : "Hjælper"}
                </p>
                <WorkerTrustCard
                  helper={otherPerson}
                  compact
                />
              </div>

              {/* Notes */}
              {bookingData.customerNotes && (
                <div className="border-t border-border/50 pt-4">
                  <p className="text-sm font-semibold mb-1">Noter</p>
                  <p className="text-sm text-muted-foreground">{bookingData.customerNotes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="border-t border-border/50 pt-4 flex flex-wrap gap-2">
                {isCustomer && bookingData.status === "pending" && (
                  <>
                    <Button
                      onClick={() => handleStatusUpdate("accepted")}
                      className="rounded-xl bg-[var(--trust)] hover:bg-[var(--trust)]/90 text-white"
                    >
                      <CheckCircle className="size-4" />
                      Accepter
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate("cancelled")}
                      variant="outline"
                      className="rounded-xl border-red-300 text-red-600"
                    >
                      <XCircle className="size-4" />
                      Afvis
                    </Button>
                  </>
                )}
                {isHelper && bookingData.status === "accepted" && (
                  <Button
                    onClick={() => handleStatusUpdate("in_progress")}
                    className="rounded-xl bg-[var(--safety)] hover:bg-[var(--safety)]/90 text-white"
                  >
                    Start opgave
                  </Button>
                )}
                {(isHelper || isCustomer) && bookingData.status === "in_progress" && (
                  <Button
                    onClick={() => handleStatusUpdate("completed")}
                    className="rounded-xl bg-[var(--trust)] hover:bg-[var(--trust)]/90 text-white"
                  >
                    <CheckCircle className="size-4" />
                    Markér som fuldført
                  </Button>
                )}
                {(isHelper || isCustomer) && bookingData.status === "accepted" && (
                  <Button
                    onClick={() => handleStatusUpdate("cancelled")}
                    variant="outline"
                    className="rounded-xl border-border"
                  >
                    <XCircle className="size-4" />
                    Annuller
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Booking Timeline */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Statusforløb
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BookingTimeline
                status={bookingData.status}
                hasParentApproval={helper?.age !== undefined && helper.age < 18}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Job risk card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <JobRiskCard job={job as any} customer={customer} helper={helper} />
        </motion.div>

        {/* SOS */}
        <div className="flex justify-end">
          <SOSButton
            onReport={handleSafetyReport}
            helperName={helper?.name}
          />
        </div>

        {/* Review section (completed bookings) */}
        {bookingData.status === "completed" && !bookingReview && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Skriv en anmeldelse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                      <Star className={`size-7 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Hvordan var din oplevelse?"
                  className="rounded-xl border border-border"
                  rows={3}
                />
                <Button
                  onClick={handleReview}
                  disabled={isReviewing}
                  className="rounded-xl bg-[var(--trust)] hover:bg-[var(--trust)]/90 text-white"
                >
                  <Star className="size-4" />
                  {isReviewing ? "Sender..." : "Send anmeldelse"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {bookingReview && (
          <Card className="border border-border bg-[var(--trust)]/5">
            <CardContent className="p-4 text-center text-sm font-medium">
              <CheckCircle className="size-4 inline mr-1 text-[var(--trust)]" />
              Du har anmeldt denne booking. Tak!
            </CardContent>
          </Card>
        )}

        {/* All reviews */}
        {bookingReviews && bookingReviews.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Star className="size-5 fill-amber-400 text-amber-400" />
                  Anmeldelser ({bookingReviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bookingReviews
                  .filter((r: any) => !bookingReview || r.reviewerId !== user?._id)
                  .map((r: any) => (
                  <div key={r._id} className="border border-border/50 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="size-8 rounded-lg border border-border">
                        <AvatarFallback className="rounded-lg font-bold text-xs bg-muted">
                          {r.reviewer?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {r.reviewer?.name || "Anonym"}
                          <span className="ml-2 text-xs text-muted-foreground font-normal">
                            {r.role === "customer" ? "Kunde" : "Hjælper"}
                          </span>
                        </p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`size-3 ${star <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("da-DK")}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">"{r.comment}"</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Chat */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="size-5" />
                Beskeder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Messages list */}
              <div className="h-64 overflow-y-auto space-y-3 p-3 border border-border/50 bg-muted/30 rounded-xl">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Ingen beskeder endnu.
                  </p>
                ) : (
                  messages.map((msg: any) => {
                    const isMine = msg.senderId === user?._id;
                    return (
                      <div key={msg._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl border ${
                          isMine
                            ? "bg-[var(--trust)] text-white border-[var(--trust)]"
                            : "bg-card border-border"
                        }`}>
                          {msg.isFiltered ? (
                            <p className="text-xs italic opacity-80">[Besked filtreret af sikkerhedshensyn]</p>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                          <p className="text-[10px] opacity-50 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Safe chat input */}
              {canChat ? (
                <SafeChatInput onSend={handleSendMessage} placeholder="Skriv en besked..." />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Chatten er lukket for denne booking.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
