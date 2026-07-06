import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
  UserX,
  Ban,
  Flag,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

const REPORT_TYPE_LABELS: Record<string, string> = {
  grooming_attempt: "Grooming-forsøg",
  off_platform_contact: "Kontakt uden for app",
  cash_payment_request: "Anmodning om kontantbetaling",
  unsafe_request: "Usikker anmodning",
  threatening_language: "Truende sprogbrug",
  inappropriate_message: "Upassende besked",
  suspicious_customer: "Mistænkelig kunde",
  no_show: "Mødte ikke op",
  other: "Andet",
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  grooming_attempt: "bg-red-100 text-red-800 border-red-300",
  off_platform_contact: "bg-amber-100 text-amber-800 border-amber-300",
  cash_payment_request: "bg-amber-100 text-amber-800 border-amber-300",
  unsafe_request: "bg-red-100 text-red-800 border-red-300",
  threatening_language: "bg-red-100 text-red-800 border-red-300",
  inappropriate_message: "bg-amber-100 text-amber-800 border-amber-300",
  suspicious_customer: "bg-blue-100 text-blue-800 border-blue-300",
  no_show: "bg-gray-100 text-gray-800 border-gray-300",
  other: "bg-muted text-muted-foreground border-border",
};

interface SafetyReport {
  _id: string;
  type: string;
  description?: string;
  reporterId?: string;
  reportedUserId?: string;
  bookingId?: string;
  messageContent?: string;
  status: string;
  createdAt: number;
  reporter?: { name?: string };
  reportedUser?: { name?: string };
  booking?: any;
}

export function AdminSafetyReportCard({
  report,
  onWarn,
  onSuspend,
  onBan,
  onResolve,
  onMarkFalsePositive,
  className,
  compact = false,
}: {
  report: SafetyReport;
  onWarn?: () => void;
  onSuspend?: () => void;
  onBan?: () => void;
  onResolve?: () => void;
  onMarkFalsePositive?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const typeLabel = REPORT_TYPE_LABELS[report.type] || report.type;
  const severity =
    report.type === "grooming_attempt" ||
    report.type === "threatening_language"
      ? "high"
      : report.type === "off_platform_contact" ||
          report.type === "cash_payment_request"
        ? "medium"
        : "low";

  const severityColor =
    severity === "high"
      ? "text-red-600"
      : severity === "medium"
        ? "text-amber-600"
        : "text-muted-foreground";

  if (compact) {
    return (
      <div className={cn("flex items-start gap-3 p-3 rounded-xl border border-border bg-card", className)}>
        <div className={cn(
          "size-8 rounded-lg flex items-center justify-center shrink-0",
          severity === "high" ? "bg-red-100" : severity === "medium" ? "bg-amber-100" : "bg-muted"
        )}>
          {severity === "high" ? (
            <AlertTriangle className="size-4 text-red-600" />
          ) : (
            <Flag className={cn("size-4", severityColor)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{typeLabel}</span>
            <Badge
              variant="outline"
              className={cn("text-[10px] border", REPORT_TYPE_COLORS[report.type] || "border-border")}
            >
              {report.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {report.reportedUser?.name || "Anonym"} •{" "}
            {new Date(report.createdAt).toLocaleDateString("da-DK")}
          </p>
          {report.status !== "open" && (
            <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 bg-green-50 mt-1">
              {report.status === "resolved" ? "Løst" : report.status === "false_positive" ? "Falsk alarm" : report.status}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "border",
      severity === "high" ? "border-red-300" : severity === "medium" ? "border-amber-300" : "border-border",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {severity === "high" ? (
              <ShieldAlert className="size-5 text-red-600" />
            ) : (
              <Flag className={cn("size-5", severityColor)} />
            )}
            <CardTitle className="text-base font-semibold">{typeLabel}</CardTitle>
          </div>
          <Badge variant="outline" className={cn("border", REPORT_TYPE_COLORS[report.type] || "border-border")}>
            {report.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Description */}
        {report.description && (
          <p className="text-sm text-muted-foreground">{report.description}</p>
        )}

        {/* Blocked message content */}
        {report.messageContent && (
          <div className="p-2.5 bg-muted rounded-lg border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              Blokeret besked:
            </p>
            <p className="text-sm italic">"{report.messageContent}"</p>
          </div>
        )}

        {/* People involved */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Indberetter</p>
            <p className="font-medium">{report.reporter?.name || "Anonym"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Indberettet bruger</p>
            <p className={cn("font-medium", severity === "high" && "text-red-600")}>
              {report.reportedUser?.name || "Anonym"}
            </p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {new Date(report.createdAt).toLocaleString("da-DK")}
        </div>

        {/* Status if resolved */}
        {report.status !== "open" && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-300 rounded-lg text-sm text-green-800">
            <CheckCircle2 className="size-4" />
            {report.status === "resolved" ? "Løst" : report.status === "false_positive" ? "Markeret som falsk alarm" : report.status}
          </div>
        )}

        {/* Actions */}
        {report.status === "open" && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
            {onWarn && (
              <Button variant="outline" size="sm" onClick={onWarn} className="text-xs">
                <MessageSquare className="size-3" />
                Advar
              </Button>
            )}
            {onSuspend && (
              <Button variant="outline" size="sm" onClick={onSuspend} className="text-xs text-amber-600 border-amber-300">
                <UserX className="size-3" />
                Suspendér
              </Button>
            )}
            {onBan && (
              <Button variant="outline" size="sm" onClick={onBan} className="text-xs text-red-600 border-red-300">
                <Ban className="size-3" />
                Udeluk
              </Button>
            )}
            {onMarkFalsePositive && (
              <Button variant="ghost" size="sm" onClick={onMarkFalsePositive} className="text-xs text-muted-foreground">
                Falsk alarm
              </Button>
            )}
            {onResolve && (
              <Button variant="ghost" size="sm" onClick={onResolve} className="text-xs text-[var(--trust)]">
                <CheckCircle2 className="size-3" />
                Løst
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
