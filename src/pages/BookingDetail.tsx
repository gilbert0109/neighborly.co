import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api, type Id } from "@/convex/_generated/api";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Star,
  User,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

export default function BookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookingData = useQuery(
    api.bookings.getBooking,
    bookingId ? { bookingId: bookingId as Id<"bookings"> } : "skip"
  );
  const rawMessages = useQuery(
    api.messages.getMessages,
    bookingId ? { bookingId: bookingId as Id<"bookings"> } : "skip"
  );
  const messages = rawMessages || [];

  const updateStatus = useMutation(api.bookings.updateBookingStatus);
  const sendMessage = useMutation(api.messages.sendMessage);
  const createReview = useMutation(api.reviews.createReview);
  const bookingReview = useQuery(
    api.reviews.getBookingReview,
    bookingId ? { bookingId: bookingId as Id<"bookings"> } : "skip"
  );

  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
        <Card className="rounded-none border-2 border-foreground max-w-2xl">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-bold">Booking ikke fundet</p>
            <Button
              onClick={() => navigate("/bookings")}
              variant="link"
              className="mt-2"
            >
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

  const handleStatusUpdate = async (
    status: "accepted" | "in_progress" | "completed" | "cancelled"
  ) => {
    try {
      await updateStatus({ bookingId: bookingId as Id<"bookings">, status });
      toast.success(`${STATUS_LABELS[status] || status}`);
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke opdatere status");
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    setIsSending(true);
    try {
      await sendMessage({
        bookingId: bookingId as Id<"bookings">,
        content: chatInput.trim(),
      });
      setChatInput("");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke sende besked");
    } finally {
      setIsSending(false);
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
        bookingId: bookingId as Id<"bookings">,
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
          <Card className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-black">
                    {job?.title || "Opgave"}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge
                      className={`rounded-none border border-foreground ${STATUS_COLORS[bookingData.status] || ""}`}
                    >
                      {STATUS_LABELS[bookingData.status] || bookingData.status}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="rounded-none border border-foreground"
                    >
                      {bookingData.paymentStatus}
                    </Badge>
                  </div>
                </div>
                <p className="text-2xl font-black shrink-0">
                  {bookingData.price} kr
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">
                    Planlagt
                  </p>
                  <p className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(bookingData.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
                {job?.address && (
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">
                      Adresse
                    </p>
                    <p className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {job.address}
                      {job.city ? `, ${job.city}` : ""}
                    </p>
                  </div>
                )}
              </div>

              {/* Other person */}
              <div className="border-t-2 border-foreground/10 pt-4">
                <p className="text-sm font-bold mb-2 flex items-center gap-2">
                  <User className="size-4" />
                  {isHelper ? "Kunde" : "Hjælper"}
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 rounded-none border-2 border-foreground">
                    <AvatarFallback className="rounded-none font-bold text-sm">
                      {otherPerson?.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold">
                      {otherPerson?.name || "Anonym"}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="size-3 fill-accent text-accent" />
                      {otherPerson?.averageRating?.toFixed(1) || "—"}
                      <span className="text-xs">
                        ({otherPerson?.totalReviews || 0})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {bookingData.customerNotes && (
                <div className="border-t-2 border-foreground/10 pt-4">
                  <p className="text-sm font-bold mb-1">Noter</p>
                  <p className="text-sm text-muted-foreground">
                    {bookingData.customerNotes}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="border-t-2 border-foreground/10 pt-4 flex flex-wrap gap-2">
                {isCustomer && bookingData.status === "pending" && (
                  <>
                    <Button
                      onClick={() => handleStatusUpdate("accepted")}
                      className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="size-4" />
                      Accepter
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate("cancelled")}
                      variant="outline"
                      className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] text-red-600"
                    >
                      <XCircle className="size-4" />
                      Afvis
                    </Button>
                  </>
                )}
                {isHelper && bookingData.status === "accepted" && (
                  <Button
                    onClick={() => handleStatusUpdate("in_progress")}
                    className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                  >
                    Start opgave
                  </Button>
                )}
                {(isHelper || isCustomer) &&
                  bookingData.status === "in_progress" && (
                    <Button
                      onClick={() => handleStatusUpdate("completed")}
                      className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="size-4" />
                      Markér som fuldført
                    </Button>
                  )}
                {(isHelper || isCustomer) &&
                  bookingData.status === "accepted" && (
                    <Button
                      onClick={() => handleStatusUpdate("cancelled")}
                      variant="outline"
                      className="rounded-none border-2 border-foreground"
                    >
                      <XCircle className="size-4" />
                      Annuller
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Review section (completed bookings) */}
        {bookingData.status === "completed" && !bookingReview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)]">
              <CardHeader>
                <CardTitle className="text-lg font-black">
                  Skriv en anmeldelse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`size-7 ${
                          star <= rating
                            ? "fill-accent text-accent"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Hvordan var din oplevelse?"
                  className="rounded-none border-2 border-foreground"
                  rows={3}
                />
                <Button
                  onClick={handleReview}
                  disabled={isReviewing}
                  className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                >
                  <Star className="size-4" />
                  {isReviewing ? "Sender..." : "Send anmeldelse"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {bookingReview && (
          <Card className="rounded-none border-2 border-foreground bg-accent/30">
            <CardContent className="p-4 text-center text-sm font-medium">
              <CheckCircle className="size-4 inline mr-1 text-green-600" />
              Du har anmeldt denne booking. Tak!
            </CardContent>
          </Card>
        )}

        {/* Chat */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="rounded-none border-2 border-foreground">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <MessageSquare className="size-5" />
                Beskeder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Messages list */}
              <div className="h-64 overflow-y-auto space-y-3 p-2 border-2 border-foreground/10 bg-muted/30">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Ingen beskeder endnu. Sig hej!
                  </p>
                ) : (
                  messages.map((msg: any) => {
                    const isMine = msg.senderId === user?._id;
                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 border-2 border-foreground ${
                            isMine
                              ? "bg-primary text-primary-foreground"
                              : "bg-card"
                          }`}
                        >
                          {msg.isFiltered ? (
                            <p className="text-xs italic">
                              [Besked filtreret af sikkerhedshensyn]
                            </p>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}
                          <p className="text-[10px] opacity-50 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              {canChat ? (
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Skriv en besked..."
                    className="flex-1 rounded-none border-2 border-foreground"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !chatInput.trim()}
                    className="rounded-none border-2 border-foreground shadow-[2px_2px_0px_0px_var(--color-foreground)]"
                    size="icon"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
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
