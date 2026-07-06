import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SafetyBadge } from "@/components/safety-badge";
import { cn } from "@/lib/utils";
import { Star, MapPin, Award } from "lucide-react";

export function WorkerTrustCard({
  helper,
  className,
  compact = false,
  showDetails = true,
}: {
  helper?: {
    name?: string;
    age?: number;
    isVerified?: boolean;
    averageRating?: number;
    totalReviews?: number;
    completedJobs?: number;
    city?: string;
  } | null;
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}) {
  if (!helper) return null;

  const initials = helper.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const isMinor = helper.age !== undefined && helper.age < 18;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card", className)}>
        <Avatar className="size-9 rounded-lg border border-border">
          <AvatarFallback className="rounded-lg text-xs font-semibold bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">
              {helper.name?.split(" ")[0] || "Anonym"}
            </p>
            {helper.isVerified && (
              <SafetyBadge variant="mitid-verified" showIcon={false} />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {helper.averageRating?.toFixed(1) || "—"}
            </span>
            {helper.completedJobs !== undefined && (
              <span>{helper.completedJobs} opgaver</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border border-border", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 rounded-xl border border-border">
            <AvatarFallback className="rounded-xl text-lg font-semibold bg-muted">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{helper.name || "Anonym"}</p>
              {helper.isVerified && (
                <SafetyBadge variant="mitid-verified" />
              )}
              {isMinor && (
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                  <Award className="size-2.5" />
                  Forældregodkendt
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                {helper.averageRating?.toFixed(1) || "—"}
                <span className="text-xs">({helper.totalReviews || 0})</span>
              </span>
              {helper.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {helper.city}
                </span>
              )}
            </div>

            {showDetails && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {helper.isVerified && (
                  <SafetyBadge variant="customer-verified" />
                )}
                {isMinor && (
                  <SafetyBadge variant="minor-helper" />
                )}
                {(helper.completedJobs || 0) >= 5 && (
                  <SafetyBadge variant="trusted-helper" />
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
