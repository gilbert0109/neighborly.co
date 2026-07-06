import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  HeartHandshake,
  Sun,
  CreditCard,
  MessageSquareOff,
  Clock,
  UserCheck,
} from "lucide-react";

interface TrustFeature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FEATURES: TrustFeature[] = [
  {
    icon: ShieldCheck,
    title: "MitID-verificerede kunder",
    description: "Alle kunder bekræfter deres identitet via MitID, Danmarks officielle digitale ID.",
  },
  {
    icon: HeartHandshake,
    title: "Forældregodkendte unge",
    description: "Unge under 18 kræver aktiv forældregodkendelse før de kan booke opgaver.",
  },
  {
    icon: Sun,
    title: "Kun sikre udendørs opgaver",
    description: "Alle opgaver er udendørs og foregår i dagtimerne for unge under 18.",
  },
  {
    icon: CreditCard,
    title: "Betaling i appen",
    description: "Sikker betaling gennem appen — ingen kontanter eller MobilePay mellem parter.",
  },
  {
    icon: Clock,
    title: "Sikre arbejdstider",
    description: "Unge under 18 arbejder kun mellem kl. 08:00 og 18:00.",
  },
  {
    icon: MessageSquareOff,
    title: "Sikker beskedfunktion",
    description: "Al kommunikation bliver i appen. Ingen telefonnumre, ingen kontanter, ingen eksterne beskeder.",
  },
  {
    icon: UserCheck,
    title: "Screeningssystem",
    description: "Mistænkelig adfærd og upassende beskeder blokeres og rapporteres til admin.",
  },
];

export function TrustExplainer({
  features,
  className,
  columns = 2,
}: {
  features?: TrustFeature[];
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  const items = features || FEATURES;

  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {items.map((feature) => {
        const Icon = feature.icon;
        return (
          <div
            key={feature.title}
            className="group p-4 rounded-xl border border-border bg-card hover:border-[var(--trust)]/30 hover:bg-[var(--trust)]/5 transition-colors"
          >
            <div className="size-10 rounded-lg bg-[var(--trust)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--trust)]/20 transition-colors">
              <Icon className="size-5 text-[var(--trust)]" />
            </div>
            <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function TrustExplainerRow({
  className,
}: {
  className?: string;
}) {
  const icons = [ShieldCheck, HeartHandshake, Sun, CreditCard, MessageSquareOff, Clock];
  const labels = [
    "MitID-verificeret",
    "Forældregodkendt",
    "Kun udendørs",
    "Betaling i appen",
    "Sikker chat",
    "Dagtimer",
  ];

  return (
    <div className={cn("flex flex-wrap gap-3 justify-center", className)}>
      {icons.map((Icon, i) => (
        <div
          key={labels[i]}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Icon className="size-3.5 text-[var(--trust)]" />
          <span>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
