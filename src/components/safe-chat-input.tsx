import { useState, useCallback, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useChatSafety, useReducedMotionSafe } from "@/hooks/use-safety";
import { Send, AlertTriangle, ShieldAlert } from "lucide-react";

export function SafeChatInput({
  onSend,
  disabled,
  placeholder = "Skriv en besked...",
  className,
}: {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showSevereModal, setShowSevereModal] = useState(false);
  const safety = useChatSafety(input);
  const { prefersReducedMotion } = useReducedMotionSafe();

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;

    // Client-side safety check — for severe messages, still send to backend
    // so the safety report can be created via the Convex scheduler
    if (safety.blocked && !safety.severe) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }

    setIsSending(true);
    try {
      await onSend(input.trim());
      // Severe messages get through to backend but are blocked there with a report
      if (safety.severe) {
        setShowSevereModal(true);
      } else {
        setInput("");
        setShowWarning(false);
      }
    } catch (e: any) {
      // If backend blocks it, show warning/modal
      if (e.message?.includes("blokeret") || e.message?.includes("sikkerhedsrapport")) {
        setShowSevereModal(true);
      }
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, safety, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isBlocked = safety.blocked && input.trim().length > 0;
  const canSend = input.trim().length > 0 && !isBlocked && !isSending;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Severe warning modal */}
      <AnimatePresence>
        {showSevereModal && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-3 bg-red-50 border border-red-400 rounded-xl"
          >
            <div className="flex items-start gap-2">
              <ShieldAlert className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Besked blokeret af sikkerhedshensyn
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Denne besked kan ikke sendes. En sikkerhedsrapport er oprettet.
                  {safety.reason === "grooming_attempt" &&
                    " Kontakt support hvis du har spørgsmål."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSevereModal(false)}
                  className="mt-2 border-red-300 text-red-700 text-xs"
                >
                  Luk
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Inline warning */}
        {showWarning && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800"
          >
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
            <span>{safety.warningText || "Denne besked kan ikke sendes"}</span>
          </motion.div>
        )}

        {/* Live detection indicator */}
        {isBlocked && !showWarning && !showSevereModal && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-2 bg-red-50 border border-red-300 rounded-lg text-xs text-red-700"
          >
            <AlertTriangle className="size-3.5 shrink-0 text-red-600" />
            <span>
              {safety.severe
                ? "Indhold tilladt — beskeden vil blive blokeret"
                : "Indhold ikke tilladt — beskeden vil blive blokeret"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (showWarning) setShowWarning(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className={cn(
            "flex-1 rounded-xl border border-border bg-background focus-visible:ring-[var(--safety)]",
            isBlocked && "border-red-400 focus-visible:ring-red-400",
            "transition-all",
            !prefersReducedMotion && isBlocked && "animate-[shake_0.3s_ease-in-out]"
          )}
        />
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className={cn(
            "rounded-xl shrink-0",
            isBlocked
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-[var(--trust)] hover:bg-[var(--trust)]/90 text-white"
          )}
        >
          {isSending ? (
            <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
