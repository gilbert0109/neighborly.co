import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api, type Id } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  HeartHandshake,
  CheckCircle2,
  Clock,
  MapPin,
  Sun,
  ShieldAlert,
  MessageSquare,
  PauseCircle,
  Play,
  AlertTriangle,
  User,
  Calendar,
  Save,
  Ban,
} from "lucide-react";
import { SafetyBadge, SafetyBadgeGroup } from "@/components/safety-badge";
import { ParentApprovalCard } from "@/components/parent-approval-card";
import { useReducedMotionSafe } from "@/hooks/use-safety";
import { JOB_CATEGORIES, JOB_CATEGORY_LABELS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STAGGER_DELAY = 0.06;

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { prefersReducedMotion } = useReducedMotionSafe();
  const approval = useQuery(api.parentApprovals.getParentApproval);
  const myBookings = useQuery(api.bookings.getMyBookings);
  const updatePermissions = useMutation(api.parentApprovals.updateParentPermissions);
  const revokeApproval = useMutation(api.parentApprovals.revokeParentApproval);

  const [isSaving, setIsSaving] = useState(false);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editMaxDistance, setEditMaxDistance] = useState("5");
  const [editStartTime, setEditStartTime] = useState("08:00");
  const [editEndTime, setEditEndTime] = useState("18:00");
  const [editPerJob, setEditPerJob] = useState(false);

  // Initialize edit state from approval when it loads
  useEffect(() => {
    if (approval && editCategories.length === 0) {
      setEditCategories(approval.allowedCategories || []);
      setEditMaxDistance((approval.maxDistanceKm || 5).toString());
      setEditStartTime(approval.allowedStartTime || "08:00");
      setEditEndTime(approval.allowedEndTime || "18:00");
      setEditPerJob(approval.perJobApproval || false);
    }
  }, [approval]);

  const isLoading = approval === undefined || myBookings === undefined;
  const isMinor = user?.age !== undefined && user.age < 18;

  const activeBookings = (myBookings || []).filter(
    (b: any) => b.status === "in_progress" || b.status === "accepted" || b.status === "pending"
  );

  const animProps = (i: number) => ({
    initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * STAGGER_DELAY, duration: prefersReducedMotion ? 0.1 : 0.24 },
  });

  const handleSaveSettings = async () => {
    if (!user?._id) return;
    setIsSaving(true);
    try {
      await updatePermissions({
        childId: user._id as Id<"users">,
        allowedCategories: editCategories.length > 0 ? editCategories as any : undefined,
        maxDistanceKm: parseInt(editMaxDistance) || 5,
        allowedStartTime: editStartTime,
        allowedEndTime: editEndTime,
        perJobApproval: editPerJob,
      });
      toast.success("Indstillinger gemt!");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke gemme indstillinger");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePause = async () => {
    try {
      await updatePermissions({
        childId: user?._id as Id<"users">,
        paused: true,
      });
      toast.success("Godkendelse sat på pause");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke sætte på pause");
    }
  };

  const handleResume = async () => {
    try {
      await updatePermissions({
        childId: user?._id as Id<"users">,
        paused: false,
      });
      toast.success("Godkendelse genoptaget");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke genoptage");
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm("Er du sikker på at du vil tilbagekalde forældregodkendelsen?")) return;
    try {
      await revokeApproval({ childId: user?._id as Id<"users"> });
      toast.success("Godkendelse tilbagekaldt");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke tilbagekalde");
    }
  };

  const toggleCategory = (cat: string) => {
    setEditCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-8">
        {/* Header */}
        <motion.div {...animProps(0)}>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[var(--trust)]/10 flex items-center justify-center">
              <HeartHandshake className="size-5 text-[var(--trust)]" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Forældrekontrol</h2>
              <p className="text-muted-foreground mt-1">
                Administrer {user?.name?.split(" ")[0] || "dit barn"s} indstillinger og sikkerhed
              </p>
            </div>
          </div>
        </motion.div>

        {/* Safety summary bar */}
        <motion.div {...animProps(1)}>
          <div className="flex flex-wrap gap-2 p-3 bg-[var(--trust)]/5 border border-[var(--trust)]/20 rounded-xl">
            <SafetyBadge variant="outdoor-only" />
            <SafetyBadge variant="safe-hours" />
            <SafetyBadge variant="payment-secured" />
            {approval?.approved && !approval.revokedAt && (
              <SafetyBadge variant="parent-approved" />
            )}
          </div>
        </motion.div>

        {/* Current approval status */}
        <motion.div {...animProps(2)}>
          <ParentApprovalCard
            approval={approval ? {
              childName: user?.name,
              allowedCategories: approval.allowedCategories || [],
              maxDistanceKm: approval.maxDistanceKm || 5,
              allowedStartTime: approval.allowedStartTime || "08:00",
              allowedEndTime: approval.allowedEndTime || "18:00",
              perJobApproval: approval.perJobApproval || false,
              approved: approval.approved,
              paused: approval.paused,
              revokedAt: approval.revokedAt,
              emergencyContactPhone: approval.emergencyContactPhone,
            } : null}
            onRevoke={handleRevoke}
            onPause={handlePause}
            onResume={handleResume}
          />
        </motion.div>

        {/* Settings */}
        <motion.div {...animProps(3)}>
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sun className="size-5 text-amber-600" />
                Indstillinger for godkendte opgaver
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Allowed categories */}
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Godkendte kategorier
                </label>
                <div className="flex flex-wrap gap-2">
                  {JOB_CATEGORIES.map((cat) => {
                    const isSelected = editCategories.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        onClick={() => toggleCategory(cat.value)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                          isSelected
                            ? "bg-[var(--trust)] text-white border-[var(--trust)]"
                            : "bg-background border-border hover:border-[var(--trust)]/50"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Vælg de kategorier dit barn må arbejde med. Lad alle være valgt for fuld adgang.
                </p>
              </div>

              {/* Max distance + times */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Max afstand (km)</label>
                  <Input
                    type="number"
                    value={editMaxDistance}
                    onChange={(e) => setEditMaxDistance(e.target.value)}
                    min="1"
                    max="50"
                    className="rounded-xl border border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Fra kl.</label>
                  <Input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="rounded-xl border border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Til kl.</label>
                  <Input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="rounded-xl border border-border"
                  />
                </div>
              </div>

              {/* Per-job approval */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border">
                <button
                  onClick={() => setEditPerJob(!editPerJob)}
                  className={`size-5 rounded border-2 flex items-center justify-center transition-colors ${
                    editPerJob
                      ? "bg-[var(--trust)] border-[var(--trust)]"
                      : "border-border bg-background"
                  }`}
                >
                  {editPerJob && <CheckCircle2 className="size-3.5 text-white" />}
                </button>
                <div>
                  <p className="text-sm font-medium">Godkend hver opgave individuelt</p>
                  <p className="text-xs text-muted-foreground">
                    Dit barn skal spørge om lov til hver enkelt opgave
                  </p>
                </div>
              </div>

              {/* Save */}
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full rounded-xl bg-[var(--trust)] hover:bg-[var(--trust)]/90 text-white shadow-sm"
              >
                <Save className="size-4" />
                {isSaving ? "Gemmer..." : "Gem indstillinger"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active jobs */}
        <motion.div {...animProps(4)}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="size-5" />
            Aktive bookinger
          </h3>
          {activeBookings.length === 0 ? (
            <Card className="border border-dashed border-border bg-muted/30">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Ingen aktive bookinger
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((booking: any, i: number) => (
                <motion.div key={booking._id} {...animProps(5 + i)}>
                  <Card
                    className="border border-border cursor-pointer hover:shadow-sm transition-all"
                    onClick={() => navigate(`/bookings/${booking._id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{booking.job?.title || "Opgave"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {booking.job?.address}{booking.job?.city ? `, ${booking.job.city}` : ""}
                          </p>
                        </div>
                        <Badge className={`border ${
                          booking.status === "in_progress"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : booking.status === "accepted"
                              ? "bg-blue-100 text-blue-800 border-blue-300"
                              : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}>
                          {booking.status === "in_progress" ? "I gang" : booking.status === "accepted" ? "Godkendt" : "Afventer"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(booking.scheduledDate).toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {booking.job?.category ? JOB_CATEGORY_LABELS[booking.job.category] || booking.job.category : ""}
                        </span>
                        <span className="font-semibold">{booking.price} kr</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Safety alerts section */}
        <motion.div {...animProps(6)}>
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="size-5 text-[var(--safety)]" />
                Sikkerhed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[var(--trust)]/5 border border-[var(--trust)]/20 rounded-xl">
                <ShieldAlert className="size-4 text-[var(--trust)] shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Al kommunikation mellem dit barn og kunder foregår sikkert i appen. Upassende beskeder blokeres automatisk.
                </p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--safety)]/5 border border-[var(--safety)]/20 rounded-xl">
                <MapPin className="size-4 text-[var(--safety)] shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Dit barns præcise lokation deles kun under aktive bookinger, og kun med kunden.
                </p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <MessageSquare className="size-4 text-amber-600 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Du kan til enhver tid kontakte os på support@neighborly.dk hvis du har spørgsmål eller bekymringer.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
