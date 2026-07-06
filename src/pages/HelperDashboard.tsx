import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Briefcase,
  CalendarCheck,
  Star,
  Clock,
  ArrowRight,
  Search,
  ShieldCheck,
  MapPin,
  HeartHandshake,
  Sun,
} from "lucide-react";
import { SafetyBadge, SafetyBadgeGroup } from "@/components/safety-badge";
import { WorkerTrustCard } from "@/components/worker-trust-card";
import { useParentPermissions } from "@/hooks/use-safety";
import { useReducedMotionSafe } from "@/hooks/use-safety";
import { STATUS_LABELS, JOB_CATEGORY_LABELS } from "@/lib/constants";

const STAGGER_DELAY = 0.06;

export default function HelperDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { prefersReducedMotion } = useReducedMotionSafe();
  const myBookings = useQuery(api.bookings.getMyBookings);
  const openJobs = useQuery(api.jobs.listJobs, { status: "open" });
  const parentPerms = useParentPermissions(user?._id as any);

  const isLoading = myBookings === undefined || openJobs === undefined;

  const activeBookings = (myBookings || []).filter(
    (b: any) => b.status === "pending" || b.status === "accepted" || b.status === "in_progress"
  );
  const completedBookings = (myBookings || []).filter((b: any) => b.status === "completed");

  const isMinor = user?.age !== undefined && user.age < 18;
  const safeCategories = openJobs?.filter((j: any) =>
    isMinor && parentPerms.allowedCategories.length > 0
      ? parentPerms.allowedCategories.includes(j.category)
      : true
  ) || [];

  const animProps = (i: number) => ({
    initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * STAGGER_DELAY, duration: prefersReducedMotion ? 0.1 : 0.24 },
  });

  if (isLoading || user === undefined) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl space-y-8">
        {/* Welcome + safety status */}
        <motion.div {...animProps(0)}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                Hej, {user?.name?.split(" ")[0] || "hjælper"}!
              </h2>
              <p className="text-muted-foreground mt-1">
                {isMinor
                  ? "Sikre opgaver i nabolaget — kun inden for dine forældres indstillinger"
                  : "Find sikre udendørs opgaver i dit nabolag"}
              </p>
            </div>
            <Button
              onClick={() => navigate("/jobs")}
              className="rounded-xl bg-[var(--trust)] hover:bg-[var(--trust)]/90 text-white shadow-sm shrink-0"
            >
              <Search className="size-4" />
              Find opgaver
              <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <SafetyBadge variant="outdoor-only" />
            <SafetyBadge variant="payment-secured" />
            {isMinor && parentPerms.hasApproval && (
              <SafetyBadge variant="parent-approved" />
            )}
            {isMinor && (
              <SafetyBadge variant="safe-hours" />
            )}
            {user?.isVerified && (
              <SafetyBadge variant="mitid-verified" />
            )}
          </div>
        </motion.div>

        {/* Parent approval status (for minors) */}
        {isMinor && (
          <motion.div {...animProps(1)}>
            <Card className={`border ${parentPerms.hasApproval ? "border-[var(--trust)]/30 bg-[var(--trust)]/5" : "border-amber-300 bg-amber-50/50"}`}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <HeartHandshake className={`size-5 ${parentPerms.hasApproval ? "text-[var(--trust)]" : "text-amber-600"}`} />
                  <div>
                    <p className="text-sm font-semibold">
                      {parentPerms.hasApproval ? "Forældregodkendelse aktiv" : "Afventer forældregodkendelse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {parentPerms.hasApproval
                        ? `${parentPerms.allowedCategories.length} kategorier · ${parentPerms.maxDistanceKm} km · ${parentPerms.allowedStartTime}–${parentPerms.allowedEndTime}`
                        : "Du skal have forældregodkendelse før du kan booke opgaver"}
                    </p>
                  </div>
                </div>
                {!parentPerms.hasApproval && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/profile")}
                    className="shrink-0 rounded-lg border-border"
                  >
                    Gå til profil
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Aktive bookinger", value: activeBookings.length, icon: CalendarCheck, color: "text-[var(--safety)]" },
            { label: "Fuldførte", value: completedBookings.length, icon: Star, color: "text-[var(--trust)]" },
            { label: "Ledige opgaver", value: safeCategories.length, icon: Briefcase, color: "text-amber-600" },
          ].map((stat, i) => (
            <motion.div key={stat.label} {...animProps(i + 2)}>
              <Card className="border border-border shadow-sm">
                <CardContent className="p-4 text-center">
                  <stat.icon className={`size-5 ${stat.color} mx-auto mb-1`} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Safe categories (for minors) */}
        {isMinor && parentPerms.hasApproval && (
          <motion.div {...animProps(5)}>
            <Card className="border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sun className="size-4 text-amber-600" />
                  Godkendte kategorier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parentPerms.allowedCategories.length > 0 ? (
                    parentPerms.allowedCategories.map((cat: string) => (
                      <Badge key={cat} variant="outline" className="border-[var(--trust)]/30 text-[var(--trust)] bg-[var(--trust)]/5">
                        {JOB_CATEGORY_LABELS[cat] || cat}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Alle sikre udendørs kategorier</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Active bookings */}
        {activeBookings.length > 0 && (
          <motion.div {...animProps(6)}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="size-5" />
              Aktive bookinger
            </h3>
            <div className="space-y-3">
              {activeBookings.map((booking: any, i: number) => (
                <motion.div key={booking._id} {...animProps(7 + i)}>
                  <Card
                    className="border border-border cursor-pointer hover:shadow-sm transition-all"
                    onClick={() => navigate(`/bookings/${booking._id}`)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{booking.job?.title || "Opgave"}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {booking.job?.address || "Ingen adresse"}
                          <span className="ml-2">
                            {new Date(booking.scheduledDate).toLocaleDateString("da-DK")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`border ${booking.status === "in_progress" ? "bg-amber-100 text-amber-800 border-amber-300" : booking.status === "accepted" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
                          {STATUS_LABELS[booking.status] || booking.status}
                        </Badge>
                        <p className="text-sm font-bold mt-1">{booking.price} kr</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Nearby safe jobs */}
        <motion.div {...animProps(8)}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Briefcase className="size-5" />
            Ledige opgaver i nærheden
          </h3>
          {safeCategories.length === 0 ? (
            <Card className="border border-dashed border-border bg-muted/30">
              <CardContent className="py-8 text-center">
                <Search className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  Ingen ledige opgaver lige nu
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tjek igen senere eller udvid din søgning
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {safeCategories.slice(0, 6).map((job: any, i: number) => (
                <motion.div key={job._id} {...animProps(9 + i)}>
                  <Card
                    className="border border-border cursor-pointer hover:shadow-sm transition-all"
                    onClick={() => navigate(`/jobs/${job._id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{job.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {job.description}
                          </p>
                        </div>
                        <p className="font-bold shrink-0">{job.price} kr</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/50">
                        <Badge variant="outline" className="text-[10px] border-border">
                          {JOB_CATEGORY_LABELS[job.category] || job.category}
                        </Badge>
                        {job.address && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="size-2.5" />
                            {job.address}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          {safeCategories.length > 6 && (
            <Button variant="link" onClick={() => navigate("/jobs")} className="mt-2">
              Se alle {safeCategories.length} opgaver
              <ArrowRight className="size-3" />
            </Button>
          )}
        </motion.div>

        {/* Completed bookings summary */}
        {completedBookings.length > 0 && (
          <motion.div {...animProps(15)}>
            <Card className="border border-border bg-[var(--trust)]/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="size-5 fill-amber-400 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold">{completedBookings.length} fuldførte opgaver</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.averageRating ? `Bedømmelse: ${user.averageRating.toFixed(1)}/5` : "Ingen bedømmelser endnu"}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/bookings")} className="rounded-lg border-border">
                  Se alle
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
