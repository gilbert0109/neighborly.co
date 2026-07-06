import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SafetyBadge } from "@/components/safety-badge";
import { useRiskCopy } from "@/hooks/use-safety";
import { cn } from "@/lib/utils";
import { JOB_CATEGORY_LABELS } from "@/lib/constants";
import {
  MapPin,
  Clock,
  Sun,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export function JobRiskCard({
  job,
  customer,
  helper,
  className,
}: {
  job?: {
    category?: string;
    price?: number;
    address?: string;
    city?: string;
    scheduledDate?: string;
    description?: string;
  } | null;
  customer?: { isVerified?: boolean; name?: string } | null;
  helper?: { isVerified?: boolean; age?: number } | null;
  className?: string;
}) {
  const { safetyCopy, riskLevel } = useRiskCopy({ job, customer, helper });

  if (!job) return null;

  const isOutdoor = [
    "lawn-mowing", "gardening", "dog-walking", "snow-shoveling",
    "car-washing", "leaf-raking", "outdoor-help", "other-outdoor",
  ].includes(job.category || "");

  return (
    <Card
      className={cn(
        "border",
        riskLevel === "safe"
          ? "border-[var(--trust)]/30 bg-[var(--trust)]/5"
          : riskLevel === "warning"
            ? "border-amber-300 bg-amber-50/50"
            : "border-border",
        className
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Risk header */}
        <div className="flex items-center gap-2">
          {riskLevel === "safe" ? (
            <ShieldCheck className="size-4 text-[var(--trust)]" />
          ) : riskLevel === "warning" ? (
            <AlertTriangle className="size-4 text-amber-600" />
          ) : (
            <Sun className="size-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {riskLevel === "safe"
              ? "Tryg opgave"
              : riskLevel === "warning"
                ? "Vær opmærksom"
                : "Opgave"}
          </span>
        </div>

        {/* Safety badges */}
        <div className="flex flex-wrap gap-1.5">
          {isOutdoor && <SafetyBadge variant="outdoor-only" />}
          {customer?.isVerified && <SafetyBadge variant="customer-verified" />}
          {helper?.isVerified && <SafetyBadge variant="mitid-verified" />}
          <SafetyBadge variant="payment-secured" />
        </div>

        {/* Category & details */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {job.category && (
            <Badge variant="outline" className="border-border">
              {JOB_CATEGORY_LABELS[job.category] || job.category}
            </Badge>
          )}
          {job.address && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {job.address}{job.city ? `, ${job.city}` : ""}
            </span>
          )}
          {job.scheduledDate && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(job.scheduledDate).toLocaleDateString("da-DK")}
            </span>
          )}
          {job.price && (
            <span className="font-semibold">{job.price} kr</span>
          )}
        </div>

        {/* Safety copy */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {safetyCopy}
        </p>
      </CardContent>
    </Card>
  );
}
