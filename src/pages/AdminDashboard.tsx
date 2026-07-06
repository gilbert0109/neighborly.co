import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import {
  ShieldAlert,
  AlertTriangle,
  Users,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Ban,
  Flag,
  Clock,
  Search,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { AdminSafetyReportCard } from "@/components/admin-safety-report-card";

type ReportTab = "pending" | "reviewed" | "resolved" | "dismissed";

const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: "Afventer",
  reviewed: "Gennemgået",
  resolved: "Løst",
  dismissed: "Afvist",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const stats = useQuery(api.admin.getAdminStats);
  const [reportTab, setReportTab] = useState<ReportTab>("pending");
  const reports = useQuery(api.admin.listSafetyReportsForAdmin, { status: reportTab });
  const bannedUsers = useQuery(api.admin.getBannedUsers);
  const allUsers = useQuery(api.admin.getAllUsers);

  const resolveReport = useMutation(api.admin.resolveSafetyReport);
  const unbanUser = useMutation(api.admin.unbanUser);

  // Only admins should access this page
  if (user !== undefined && user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Card className="border border-border max-w-md w-full">
            <CardContent className="p-6 text-center">
              <ShieldAlert className="size-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-lg font-semibold">Adgang nægtet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Kun administratorer har adgang til denne side.
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="mt-4 rounded-xl border-border"
              >
                <ArrowLeft className="size-4" /> Tilbage til dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (reports === undefined || bannedUsers === undefined || allUsers === undefined || stats === undefined) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  const handleResolveReport = async (
    reportId: string,
    action: "warn_user" | "suspend_user" | "ban_user" | "no_action",
    status: "reviewed" | "resolved" | "dismissed",
  ) => {
    if ((action === "ban_user" || action === "suspend_user") &&
      !window.confirm(
        action === "ban_user"
          ? "Er du sikker på at du vil udelukke denne bruger? Handlingen kan senere fortrydes."
          : "Er du sikker på at du vil suspendere denne bruger? Handlingen kan senere fortrydes."
      )) {
      return;
    }
    try {
      await resolveReport({ reportId: reportId as any, status, action,
        adminNote: `Admin ${action === "warn_user" ? "warning" : action === "suspend_user" ? "suspension" : action === "ban_user" ? "ban" : "review"}`,
      });
      toast.success(
        action === "ban_user"
          ? "Bruger udelukket"
          : action === "suspend_user"
            ? "Bruger suspenderet"
            : action === "warn_user"
              ? "Advarsel sendt"
              : "Rapport markeret som løst",
      );
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke behandle rapport");
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await unbanUser({ userId: userId as any });
      toast.success("Bruger genindsat");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke genindsætte bruger");
    }
  };

  const statCards = [
    { label: "Brugere", value: stats.totalUsers, icon: Users, color: "text-[var(--safety)]" },
    { label: "Verificerede", value: stats.verifiedUsers, icon: CheckCircle2, color: "text-[var(--trust)]" },
    { label: "Åbne sager", value: stats.pendingReports, icon: Flag, color: "text-red-600" },
    { label: "Udelukkede", value: stats.bannedUsers, icon: Ban, color: "text-amber-600" },
    { label: "Opgaver", value: stats.totalJobs, icon: Briefcase, color: "text-[var(--safety)]" },
    { label: "Bookinger", value: stats.totalBookings, icon: CalendarCheck, color: "text-[var(--trust)]" },
    { label: "Fuldførte", value: stats.completedBookings, icon: CheckCircle2, color: "text-green-600" },
    { label: "Indtægt", value: `${Math.round(stats.totalRevenue / 100)} kr`, icon: Clock, color: "text-amber-600" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Administrer sikkerhedsrapporter, brugere og platformen.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="border border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <stat.icon className={`size-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Safety Reports */}
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShieldAlert className="size-5 text-red-600" />
            Sikkerhedsrapporter
            {stats.pendingReports > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-300">
                {stats.pendingReports} åbne
              </Badge>
            )}
          </h3>

          <Tabs value={reportTab} onValueChange={(v) => setReportTab(v as ReportTab)}>
            <TabsList className="rounded-lg border border-border bg-background h-auto p-1">
              {(["pending", "reviewed", "resolved", "dismissed"] as const).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="rounded-md data-[state=active]:bg-[var(--trust)] data-[state=active]:text-white px-3 py-1.5 text-sm"
                >
                  {REPORT_STATUS_LABELS[tab]}
                </TabsTrigger>
              ))}
            </TabsList>

            {(["pending", "reviewed", "resolved", "dismissed"] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
                {reports.length === 0 ? (
                  <Card className="border border-dashed border-border bg-muted/30">
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Ingen {REPORT_STATUS_LABELS[tab].toLowerCase()} rapporter
                    </CardContent>
                  </Card>
                ) : (
                  reports.map((report: any) => (
                    <AdminSafetyReportCard
                      key={report._id}
                      report={{
                        _id: report._id,
                        type: report.reason,
                        description: report.details,
                        reporterId: report.reporterId,
                        reportedUserId: report.reportedUserId,
                        bookingId: report.bookingId,
                        messageContent: report.details?.includes("Besked:")
                          ? report.details.split("Besked:")[1]?.trim()
                          : undefined,
                        status: report.status,
                        createdAt: report.createdAt,
                        reporter: report.reporter,
                        reportedUser: report.reportedUser,
                        booking: report.booking,
                      }}
                      onWarn={() => handleResolveReport(report._id, "warn_user", "resolved")}
                      onSuspend={() => handleResolveReport(report._id, "suspend_user", "resolved")}
                      onBan={() => handleResolveReport(report._id, "ban_user", "resolved")}
                      onResolve={() => handleResolveReport(report._id, "no_action", "resolved")}
                      onMarkFalsePositive={() => handleResolveReport(report._id, "no_action", "dismissed")}
                    />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Banned users */}
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Ban className="size-5 text-amber-600" />
            Udelukkede brugere
            {bannedUsers.length > 0 && (
              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                {bannedUsers.length}
              </Badge>
            )}
          </h3>

          {bannedUsers.length === 0 ? (
            <Card className="border border-dashed border-border bg-muted/30">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Ingen udelukkede brugere
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bannedUsers.map((ban: any) => (
                <Card key={ban._id} className="border border-amber-300/50 bg-amber-50/30">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-9 rounded-lg border border-border">
                        <AvatarFallback className="rounded-lg text-xs font-bold bg-muted">
                          {ban.user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {ban.user?.name || "Anonym"}
                          <span className="ml-2 text-xs text-muted-foreground font-normal">
                            {ban.user?.role || "?"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ban.reason} • {new Date(ban.bannedAt).toLocaleDateString("da-DK")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnban(ban.userId)}
                      className="shrink-0 rounded-lg border-border text-xs"
                    >
                      <CheckCircle2 className="size-3" />
                      Genindsæt
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* All users */}
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users className="size-5 text-[var(--safety)]" />
            Alle brugere ({allUsers.length})
          </h3>

          <Card className="border border-border">
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {allUsers.map((u: any) => (
                <div key={u._id} className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <Avatar className="size-8 rounded-lg border border-border shrink-0">
                    <AvatarFallback className="rounded-lg text-xs font-bold bg-muted">
                      {u.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {u.name || "Anonym"}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">{u.email || ""}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] border-border">
                        {u.role || "ingen rolle"}
                      </Badge>
                      {u.isVerified && (
                        <Badge className="text-[10px] bg-[var(--trust)]/10 text-[var(--trust)] border-[var(--trust)]/30">MitID</Badge>
                      )}
                      {u.banned && (
                        <Badge className="text-[10px] bg-red-100 text-red-800 border-red-300">Udelukket</Badge>
                      )}
                      {u.age !== undefined && u.age < 18 && (
                        <span className="text-[10px] text-muted-foreground">{u.age} år</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(u._creationTime).toLocaleDateString("da-DK")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
