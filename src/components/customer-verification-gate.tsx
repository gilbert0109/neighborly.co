import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerificationChecklist, type ChecklistItem } from "@/components/verification-checklist";
import { cn } from "@/lib/utils";
import { Shield, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

export function CustomerVerificationGate({
  action,
  items,
  onContinue,
  className,
}: {
  action: string;
  items: ChecklistItem[];
  onContinue?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const allComplete = items.every((i) => i.completed);
  const incompleteCount = items.filter((i) => !i.completed).length;

  return (
    <Card className={cn("border border-[var(--safety)]/30 bg-[var(--safety)]/5", className)}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-[var(--safety)]/10 flex items-center justify-center shrink-0">
            <Shield className="size-5 text-[var(--safety)]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Verifikation påkrævet</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allComplete
                ? `Du er klar til at ${action}`
                : `Fuldfør ${incompleteCount} trin for at ${action}`}
            </p>
          </div>
        </div>

        <VerificationChecklist items={items} />

        {allComplete && onContinue && (
          <Button
            onClick={onContinue}
            className="w-full rounded-xl bg-[var(--safety)] hover:bg-[var(--safety)]/90 text-white"
          >
            {action}
            <ArrowRight className="size-4" />
          </Button>
        )}

        {!allComplete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/profile")}
            className="w-full rounded-xl border-border"
          >
            Gå til profil
            <ArrowRight className="size-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
