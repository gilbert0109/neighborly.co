import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldHalf,
  Sun,
  Clock,
  CreditCard,
  UserCheck,
  AlertTriangle,
  HeartHandshake,
} from "lucide-react";

export type SafetyBadgeVariant =
  | "mitid-verified"
  | "parent-approved"
  | "outdoor-only"
  | "safe-hours"
  | "payment-secured"
  | "customer-verified"
  | "minor-helper"
  | "trusted-helper";

const BADGE_CONFIG: Record<
  SafetyBadgeVariant,
  { label: string; icon: React.ElementType; className: string }
> = {
  "mitid-verified": {
    label: "MitID-verificeret",
    icon: ShieldCheck,
    className: "bg-[var(--safety)]/10 text-[var(--safety)] border-[var(--safety)]/30",
  },
  "parent-approved": {
    label: "Forældregodkendt",
    icon: HeartHandshake,
    className: "bg-[var(--trust)]/10 text-[var(--trust)] border-[var(--trust)]/30",
  },
  "outdoor-only": {
    label: "Kun udendørs",
    icon: Sun,
    className: "bg-amber-50 text-amber-700 border-amber-300",
  },
  "safe-hours": {
    label: "Dagtimer (08-18)",
    icon: Clock,
    className: "bg-blue-50 text-blue-700 border-blue-300",
  },
  "payment-secured": {
    label: "Betaling i appen",
    icon: CreditCard,
    className: "bg-green-50 text-green-700 border-green-300",
  },
  "customer-verified": {
    label: "Verificeret kunde",
    icon: UserCheck,
    className: "bg-[var(--safety)]/10 text-[var(--safety)] border-[var(--safety)]/30",
  },
  "minor-helper": {
    label: "Under 18",
    icon: ShieldHalf,
    className: "bg-amber-50 text-amber-700 border-amber-300",
  },
  "trusted-helper": {
    label: "Betroet hjælper",
    icon: HeartHandshake,
    className: "bg-[var(--trust)]/10 text-[var(--trust)] border-[var(--trust)]/30",
  },
};

export function SafetyBadge({
  variant,
  className,
  showIcon = true,
}: {
  variant: SafetyBadgeVariant;
  className?: string;
  showIcon?: boolean;
}) {
  const config = BADGE_CONFIG[variant];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", config.className, className)}
    >
      {showIcon && <Icon className="size-3" />}
      {config.label}
    </Badge>
  );
}

export function SafetyBadgeGroup({
  variants,
  className,
}: {
  variants: SafetyBadgeVariant[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {variants.map((v) => (
        <SafetyBadge key={v} variant={v} />
      ))}
    </div>
  );
}
