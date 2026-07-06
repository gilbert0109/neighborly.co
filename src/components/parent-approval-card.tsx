import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SafetyBadge, type SafetyBadgeVariant } from "@/components/safety-badge";
import { JOB_CATEGORY_LABELS } from "@/lib/constants";
import {
  HeartHandshake,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Clock,
  MapPin,
  AlertTriangle,
} from "lucide-react";

interface ParentApprovalData {
  childName?: string;
  allowedCategories: string[];
  maxDistanceKm: number;
  allowedStartTime: string;
  allowedEndTime: string;
  perJobApproval: boolean;
  approved: boolean;
  paused?: boolean;
  revokedAt?: number;
  emergencyContactPhone?: string;
}

export function ParentApprovalCard({
  approval,
  className,
  onRevoke,
  onPause,
  onResume,
  compact = false,
}: {
  approval: ParentApprovalData | null;
  className?: string;
  onRevoke?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  compact?: boolean;
}) {
  if (!approval) {
    return (
      <Card className={cn("border border-border", className)}>
        <CardContent className="p-4 text-center">
          <HeartHandshake className="size-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            Ingen forældregodkendelse endnu
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Forældre skal godkende kontoen før barnet kan booke opgaver
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusBadges: SafetyBadgeVariant[] = [];
  if (approval.approved && !approval.revokedAt && !approval.paused) {
    statusBadges.push("parent-approved");
  }
  if (approval.allowedCategories.length > 0) {
    statusBadges.push("outdoor-only");
  }
  if (approval.allowedStartTime && approval.allowedEndTime) {
    statusBadges.push("safe-hours");
  }

  if (compact) {
    return (
      <div className={cn("p-3 rounded-xl border border-border bg-card", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {approval.approved && !approval.revokedAt && !approval.paused ? (
              <CheckCircle2 className="size-4 text-[var(--trust)]" />
            ) : approval.paused ? (
              <PauseCircle className="size-4 text-amber-600" />
            ) : (
              <XCircle className="size-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {approval.approved && !approval.revokedAt && !approval.paused
                ? "Godkendt"
                : approval.paused
                  ? "Sat på pause"
                  : "Ikke godkendt"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {approval.allowedStartTime}–{approval.allowedEndTime}
          </span>
        </div>
        {approval.allowedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {approval.allowedCategories.slice(0, 3).map((cat) => (
              <Badge key={cat} variant="outline" className="text-[10px] border-border">
                {JOB_CATEGORY_LABELS[cat] || cat}
              </Badge>
            ))}
            {approval.allowedCategories.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{approval.allowedCategories.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border border-border", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HeartHandshake className="size-4 text-[var(--trust)]" />
          Forældregodkendelse
          {approval.approved && !approval.revokedAt && !approval.paused ? (
            <CheckCircle2 className="size-4 text-[var(--trust)]" />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status */}
        {approval.paused && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">Kontoen er sat på pause af forælder</p>
          </div>
        )}
        {approval.revokedAt && (
          <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-300 rounded-lg">
            <XCircle className="size-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-800">Godkendelse er tilbagekaldt</p>
          </div>
        )}

        {/* Badges */}
        {statusBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {statusBadges.map((v) => (
              <SafetyBadge key={v} variant={v} />
            ))}
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Afstand</p>
            <p className="flex items-center gap-1 mt-0.5">
              <MapPin className="size-3 text-muted-foreground" />
              {approval.maxDistanceKm} km
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Arbejdstid</p>
            <p className="flex items-center gap-1 mt-0.5">
              <Clock className="size-3 text-muted-foreground" />
              {approval.allowedStartTime}–{approval.allowedEndTime}
            </p>
          </div>
        </div>

        {/* Categories */}
        {approval.allowedCategories.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">
              Godkendte kategorier
            </p>
            <div className="flex flex-wrap gap-1">
              {approval.allowedCategories.map((cat) => (
                <Badge key={cat} variant="outline" className="border-border">
                  {JOB_CATEGORY_LABELS[cat] || cat}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Per-job approval */}
        {approval.perJobApproval && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              Hver opgave kræver separat godkendelse fra forælder
            </p>
          </div>
        )}

        {/* Emergency contact */}
        {approval.emergencyContactPhone && (
          <p className="text-xs text-muted-foreground">
            Nødtelefon: {approval.emergencyContactPhone}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {onPause && approval.approved && !approval.paused && (
            <Button variant="outline" size="sm" onClick={onPause} className="text-xs">
              <PauseCircle className="size-3" />
              Sæt på pause
            </Button>
          )}
          {onResume && approval.paused && (
            <Button variant="outline" size="sm" onClick={onResume} className="text-xs">
              <CheckCircle2 className="size-3" />
              Genoptag
            </Button>
          )}
          {onRevoke && approval.approved && !approval.revokedAt && (
            <Button variant="ghost" size="sm" onClick={onRevoke} className="text-xs text-red-600">
              <XCircle className="size-3" />
              Tilbagekald
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
