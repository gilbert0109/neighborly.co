import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api, type Id } from "@/convex/_generated/api";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Calendar,
  ArrowLeft,
  Send,
  User,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { JOB_CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const jobData = useQuery(api.jobs.getJob, jobId ? { jobId: jobId as Id<"jobs"> } : "skip");
  const createBooking = useMutation(api.bookings.createBooking);
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  if (jobData === undefined) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-24" />
        </div>
      </DashboardLayout>
    );
  }

  if (jobData === null) {
    return (
      <DashboardLayout>
        <Card className="rounded-none border-2 border-foreground max-w-2xl">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-bold">Opgave ikke fundet</p>
            <Button
              onClick={() => navigate("/jobs")}
              variant="link"
              className="mt-2"
            >
              Tilbage til opgaver
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { job, customer, bookings } = jobData;
  const existingBooking = bookings?.find(
    (b: any) => b.status !== "cancelled" && b.status !== "completed"
  );

  const handleBook = async () => {
    if (!scheduledDate) {
      toast.error("Vælg en dato");
      return;
    }
    setIsBooking(true);
    try {
      await createBooking({
        jobId: jobId as Id<"jobs">,
        scheduledDate: new Date(scheduledDate).getTime(),
        customerNotes: notes || undefined,
      });
      toast.success("Booking anmodning sendt!");
      navigate(`/bookings`);
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke booke opgave");
    } finally {
      setIsBooking(false);
    }
  };

  const isOwner = user?._id === job.customerId;
  const isHelper = user?.role === "helper";
  const canBook = isHelper && job.status === "open" && !isOwner && !existingBooking;

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate("/jobs")}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Tilbage til opgaver
        </button>

        {/* Job Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-black">
                    {job.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className="rounded-none border border-foreground">
                      {JOB_CATEGORY_LABELS[job.category] || job.category}
                    </Badge>
                    <Badge
                      className={`rounded-none border border-foreground ${STATUS_COLORS[job.status] || ""}`}
                    >
                      {STATUS_LABELS[job.status] || job.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-3xl font-black shrink-0">{job.price} kr</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">{job.description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {job.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-4" />
                    {job.address}
                    {job.city ? `, ${job.city}` : ""}
                  </span>
                )}
                {job.scheduledDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-4" />
                    {new Date(job.scheduledDate).toLocaleDateString()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="size-4" />
                  Oprettet {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Customer info */}
              {customer && (
                <div className="border-t-2 border-foreground/10 pt-4">
                  <p className="text-sm font-bold mb-2 flex items-center gap-2">
                    <User className="size-4" />
                    Oprettet af
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-accent border-2 border-foreground flex items-center justify-center">
                      <span className="font-bold text-sm">
                        {customer.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold">{customer.name || "Anonym"}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="size-3 fill-accent text-accent" />
                        {customer.averageRating?.toFixed(1) || "—"}
                        <span className="text-xs">
                          ({customer.totalReviews || 0} anmeldelser)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Existing booking */}
        {existingBooking && (
          <Card className="rounded-none border-2 border-foreground border-dashed">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-muted-foreground">
                Denne opgave har allerede en aktiv booking (
                {STATUS_LABELS[existingBooking.status] || existingBooking.status}).{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() =>
                    navigate(`/bookings/${existingBooking._id}`)
                  }
                >
                  Se booking
                </Button>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Book form (for helpers) */}
        {canBook && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)]">
              <CardHeader>
                <CardTitle className="text-lg font-black">
                  Book denne opgave
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-bold block mb-1">
                    Hvornår kan du gøre det?
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="rounded-none border-2 border-foreground"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">
                    Besked til kunden (valgfrit)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Hej! Jeg kan hjælpe med dette..."
                    className="rounded-none border-2 border-foreground"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleBook}
                  disabled={isBooking || !scheduledDate}
                  className="w-full rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  <Send className="size-4" />
                  {isBooking ? "Sender..." : "Send booking anmodning"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Cannot book (own job) */}
        {isOwner && (
          <Card className="rounded-none border-2 border-foreground border-dashed bg-muted/50">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              Dette er din egen opgave. Du kan administrere den fra dit dashboard.
            </CardContent>
          </Card>
        )}

        {/* Not a helper */}
        {!isOwner && !isHelper && !existingBooking && (
          <Card className="rounded-none border-2 border-foreground border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Du skal være hjælper for at booke opgaver.
              </p>
              <Button
                onClick={() => navigate("/profile")}
                variant="outline"
                className="rounded-none border-2 border-foreground"
              >
                Opsæt hjælper-profil
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
