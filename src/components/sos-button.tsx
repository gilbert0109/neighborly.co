import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotionSafe } from "@/hooks/use-safety";
import { ShieldAlert, Phone, MessageSquare, X } from "lucide-react";

interface SOSButtonProps {
  onReport: (type: "safety" | "emergency") => void;
  className?: string;
  helperName?: string;
}

export function SOSButton({ onReport, className, helperName }: SOSButtonProps) {
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { prefersReducedMotion } = useReducedMotionSafe();

  const handleEmergency = () => {
    setPressed(true);
    onReport("emergency");
  };

  const handleSafetyReport = () => {
    setPressed(true);
    onReport("safety");
  };

  if (pressed) {
    return (
      <div className={cn("p-4 rounded-xl bg-[var(--safety)]/10 border border-[var(--safety)]/30 text-center", className)}>
        <ShieldAlert className="size-8 text-[var(--safety)] mx-auto mb-2" />
        <p className="text-sm font-semibold text-[var(--safety)]">
          Rapport modtaget
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {helperName
            ? `En sikkerhedsrapport vedrørende ${helperName} er oprettet.`
            : "Din rapport er blevet sendt til vores sikkerhedsteam."}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Kontakt politiet på 114 hvis du er i akut fare.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-14 right-0 w-64 p-4 bg-card border border-border rounded-xl shadow-lg space-y-2 z-50"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <p className="text-sm font-semibold">Hvad vil du rapportere?</p>

            <Button
              onClick={handleSafetyReport}
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl border-border text-sm"
            >
              <MessageSquare className="size-4" />
              Sikkerhedsproblem
            </Button>

            <Button
              onClick={handleEmergency}
              variant="destructive"
              className="w-full justify-start gap-2 rounded-xl text-sm"
            >
              <Phone className="size-4" />
              Akut — ring 112
            </Button>

            <p className="text-[10px] text-muted-foreground mt-1">
              Ved akut fare: ring 112. Ved mistanke: ring 114 eller brug rapportfunktionen.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setOpen(!open)}
        variant="outline"
        size="sm"
        className={cn(
          "rounded-full border-2 border-red-400 text-red-600 hover:bg-red-50",
          "relative",
          !prefersReducedMotion && open && "ring-2 ring-red-400/50"
        )}
      >
        <ShieldAlert className="size-4" />
        Sikkerhed
      </Button>
    </div>
  );
}

export function SOSFloatingButton({
  onReport,
  className,
}: {
  onReport: (type: "safety" | "emergency") => void;
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);

  if (pressed) {
    return (
      <div className={cn("fixed bottom-4 right-4 p-4 bg-card border border-border rounded-xl shadow-lg z-50 max-w-xs", className)}>
        <ShieldAlert className="size-6 text-[var(--safety)] mb-1" />
        <p className="text-sm font-semibold">Rapport modtaget</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Sikkerhedsteamet er blevet informeret.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Ved akut fare: ring 112.
        </p>
      </div>
    );
  }

  return (
    <Button
      onClick={() => {
        setPressed(true);
        onReport("safety");
      }}
      className={cn(
        "fixed bottom-4 right-4 rounded-full size-12 p-0 bg-red-600 hover:bg-red-700 text-white shadow-lg z-50",
        !pressed && "animate-[pulse_2s_ease-in-out_infinite]",
        className
      )}
    >
      <ShieldAlert className="size-5" />
    </Button>
  );
}
