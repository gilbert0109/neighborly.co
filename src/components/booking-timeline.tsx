import { cn } from "@/lib/utils";
import { useBookingTimeline, useReducedMotionSafe } from "@/hooks/use-safety";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

const STATUS_ICONS: Record<string, React.ElementType> = {
  requested: Circle,
  awaiting_parent: Circle,
  accepted: CheckCircle2,
  in_progress: Loader2,
  completed: CheckCircle2,
  cancelled: XCircle,
  disputed: XCircle,
};

export function BookingTimeline({
  status,
  hasParentApproval,
  className,
}: {
  status: string;
  hasParentApproval?: boolean;
  className?: string;
}) {
  const { steps, currentStepIndex } = useBookingTimeline(status, hasParentApproval);
  const { prefersReducedMotion } = useReducedMotionSafe();
  const isCancelled = status === "cancelled" || status === "disputed";

  if (isCancelled) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-300 rounded-xl">
          <XCircle className="size-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {status === "cancelled" ? "Annulleret" : "Omtvistet"}
            </p>
            <p className="text-xs text-red-600">
              {status === "cancelled"
                ? "Bookingen blev annulleret"
                : "Der er en tvist om denne booking"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <AnimatePresence mode="popLayout">
        {steps.map((step, i) => {
          const Icon = STATUS_ICONS[step.key] || Circle;
          const isActive = step.active;
          const isCompleted = step.completed;
          const isLast = i === steps.length - 1;

          return (
            <motion.div
              key={step.key}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: i * 0.08,
                duration: prefersReducedMotion ? 0.1 : 0.24,
              }}
              className="flex gap-3"
            >
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "size-7 rounded-full flex items-center justify-center transition-colors",
                    isCompleted
                      ? "bg-[var(--trust)] text-white"
                      : isActive
                        ? "bg-[var(--trust)] text-white"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isActive && Icon === Loader2 ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Icon
                      className={cn(
                        "size-3.5",
                        isActive && Icon === Circle ? "animate-pulse" : ""
                      )}
                    />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 h-6 mt-1 transition-colors",
                      isCompleted ? "bg-[var(--trust)]" : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-4">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isActive
                      ? "text-foreground"
                      : isCompleted
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
