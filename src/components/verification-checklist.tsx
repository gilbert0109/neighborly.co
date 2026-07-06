import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useReducedMotionSafe } from "@/hooks/use-safety";

export interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  loading?: boolean;
}

export function VerificationChecklist({
  items,
  className,
  showCompleted = true,
}: {
  items: ChecklistItem[];
  className?: string;
  showCompleted?: boolean;
}) {
  const { prefersReducedMotion } = useReducedMotionSafe();

  const visibleItems = showCompleted ? items : items.filter((i) => !i.completed);

  if (visibleItems.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-[var(--trust)]/10 border border-[var(--trust)]/30 rounded-xl", className)}>
        <CheckCircle2 className="size-5 text-[var(--trust)] shrink-0" />
        <p className="text-sm font-medium text-[var(--trust)]">Alle trin fuldført</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <AnimatePresence mode="popLayout">
        {visibleItems.map((item, i) => (
          <motion.div
            key={item.key}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: prefersReducedMotion ? 0.1 : 0.24 }}
            className={cn(
              "flex items-center gap-2.5 p-2.5 rounded-lg transition-colors",
              item.completed
                ? "bg-[var(--trust)]/5"
                : item.loading
                  ? "bg-amber-50"
                  : "bg-muted/30"
            )}
          >
            {item.loading ? (
              <Loader2 className="size-4 text-amber-600 shrink-0 animate-spin" />
            ) : item.completed ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <CheckCircle2 className="size-4 text-[var(--trust)] shrink-0" />
              </motion.div>
            ) : (
              <Circle className="size-4 text-muted-foreground/50 shrink-0" />
            )}
            <span
              className={cn(
                "text-sm",
                item.completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground font-medium"
              )}
            >
              {item.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
