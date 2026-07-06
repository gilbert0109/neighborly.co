import { useAuth } from "./use-auth";
import { useQuery } from "convex/react";
import { api, type Id } from "@/convex/_generated/api";
import { JOB_CATEGORY_LABELS } from "@/lib/constants";
import { useMemo } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export type VerificationAction =
  | "create_job"
  | "book_booking"
  | "send_message"
  | "view_helpers"
  | "view_jobs";

export interface GateResult {
  allowed: boolean;
  reason: string | null;
  missingItems: string[];
}

export interface ChatSafetyResult {
  blocked: boolean;
  severe: boolean;
  reason: string | null;
  warningText: string | null;
  matchedPattern?: string;
}

export interface BookingTimelineStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  active: boolean;
  icon: string;
}

export interface ParentPermissions {
  allowedCategories: string[];
  maxDistanceKm: number;
  allowedStartTime: string;
  allowedEndTime: string;
  perJobApproval: boolean;
  hasApproval: boolean;
  loading: boolean;
}

// ─── Blocked patterns (shared with backend for client-side preview) ────────

const BLOCKED_PATTERNS = [
  // Phone numbers (Danish + international)
  { pattern: /(\+?\d{8,15})/g, type: "phone", severe: false },
  // Emails
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: "email", severe: false },
  // URLs
  { pattern: /(https?:\/\/[^\s]+)/g, type: "url", severe: false },
  // Social handles
  { pattern: /(snapchat|instagram|tiktok|whatsapp|telegram|signal|discord|mobilepay)/gi, type: "social_platform", severe: false },
  // Payment off-platform
  { pattern: /(mobilepay|swish|venmo|cash|paypal|bankoverførsel|bank transfer|kontant)/gi, type: "off_platform_payment", severe: false },
  // Contact outside app
  { pattern: /(text me|call me|ring mig|skriv til mig|uden for app|outside the app|mød(e)s et andet sted|meet somewhere else|anden adresse|different address|send billede|send photo|send picture|send mig)/gi, type: "off_platform_contact", severe: false },
  // Severe grooming phrases
  { pattern: /(don'?t tell your parents|fortæl ikke dine forældre|do not tell your parents|keep this secret|keep this between us|hold det hemmeligt|come alone|kom alene|are you alone|er du alene|send mig et billede|send mig et foto)/gi, type: "grooming", severe: true },
];

const SEVERE_WARNING = "Denne besked indeholder indhold, der ikke er tilladt. Beskeden er blokeret og en sikkerhedsrapport er oprettet.";
const BLOCKED_WARNING = "Denne besked indeholder kontaktoplysninger eller forsøg på at flytte kommunikationen ud af appen. Beskeden er blokeret.";

// ─── 1. useVerificationGate ────────────────────────────────────────────────

export function useVerificationGate(action: VerificationAction): GateResult {
  const { user } = useAuth();

  return useMemo(() => {
    const missing: string[] = [];

    if (!user) {
      missing.push("Du skal være logget ind");
      return { allowed: false, reason: "Log ind for at fortsætte", missingItems: missing };
    }

    if (user.isAnonymous) {
      missing.push("Opret en fuld konto");
    }

    if (!user.role) {
      missing.push("Vælg en rolle (kunde eller hjælper)");
    }

    if (action === "create_job" || action === "book_booking") {
      if (!user.isVerified) {
        missing.push("MitID-verifikation");
      }
      if (!user.name) {
        missing.push("Fulde navn");
      }
    }

    if (action === "send_message") {
      if (!user.isVerified) {
        missing.push("MitID-verifikation");
      }
    }

    if (action === "view_helpers" || action === "view_jobs") {
      if (!user.isVerified && user.role === "customer") {
        missing.push("MitID-verifikation for at se hjælpere");
      }
    }

    const allowed = missing.length === 0;
    return {
      allowed,
      reason: allowed ? null : `Fuldfør følgende først: ${missing.join(", ")}`,
      missingItems: missing,
    };
  }, [user, action]);
}

// ─── 2. useSafetyGate ──────────────────────────────────────────────────────

export function useSafetyGate({
  action,
  job,
  helper,
  customer,
}: {
  action: "book_job" | "start_job" | "view_helper";
  job?: any;
  helper?: any;
  customer?: any;
}): { allowed: boolean; reason: string | null } {
  const { user } = useAuth();

  return useMemo(() => {
    if (action === "book_job") {
      if (!job) return { allowed: false, reason: "Opgave ikke fundet" };

      // Check if category is safe (outdoor only)
      const unsafeCategories = [
        "grocery-delivery", "furniture-moving", "window-cleaning",
        "indoor-cleaning", "babysitting", "indoor-moving", "bike-repair",
      ];
      if (unsafeCategories.includes(job.category)) {
        return { allowed: false, reason: "Denne kategori er ikke tilladt for sikre udendørs opgaver" };
      }

      // Check if customer is verified
      if (customer && !customer.isVerified) {
        return { allowed: false, reason: "Kunden skal være MitID-verificeret før du kan booke opgaven" };
      }

      return { allowed: true, reason: null };
    }

    if (action === "start_job") {
      if (!job) return { allowed: false, reason: "Opgave ikke fundet" };
      if (!helper) return { allowed: false, reason: "Hjælper ikke fundet" };

      // If helper is under 18, check time restrictions
      if (helper.age !== undefined && helper.age < 18) {
        const hour = new Date().getHours();
        if (hour >= 18 || hour < 8) {
          return { allowed: false, reason: "Unge under 18 kan kun arbejde mellem kl. 08:00 og 18:00" };
        }
      }

      return { allowed: true, reason: null };
    }

    if (action === "view_helper") {
      if (!helper) return { allowed: false, reason: "Hjælper ikke fundet" };
      return { allowed: true, reason: null };
    }

    return { allowed: true, reason: null };
  }, [action, job, helper, customer]);
}

// ─── 3. useParentPermissions ──────────────────────────────────────────────

export function useParentPermissions(childId?: string): ParentPermissions {
  const approval = useQuery(
    api.parentApprovals.getChildApproval,
    childId ? { childId: childId as unknown as Id<"users"> } : "skip"
  );

  return useMemo(() => {
    if (!childId) {
      return {
        allowedCategories: [],
        maxDistanceKm: 5,
        allowedStartTime: "08:00",
        allowedEndTime: "18:00",
        perJobApproval: false,
        hasApproval: false,
        loading: false,
      };
    }

    if (approval === undefined) {
      return {
        allowedCategories: [],
        maxDistanceKm: 5,
        allowedStartTime: "08:00",
        allowedEndTime: "18:00",
        perJobApproval: false,
        hasApproval: false,
        loading: true,
      };
    }

    if (!approval) {
      return {
        allowedCategories: [],
        maxDistanceKm: 5,
        allowedStartTime: "08:00",
        allowedEndTime: "18:00",
        perJobApproval: false,
        hasApproval: false,
        loading: false,
      };
    }

    return {
      allowedCategories: approval.allowedCategories || [],
      maxDistanceKm: approval.maxDistanceKm || 5,
      allowedStartTime: approval.allowedStartTime || "08:00",
      allowedEndTime: approval.allowedEndTime || "18:00",
      perJobApproval: approval.perJobApproval || false,
      hasApproval: approval.approved && !approval.revokedAt && !approval.paused,
      loading: false,
    };
  }, [childId, approval]);
}

// ─── 4. useChatSafety ──────────────────────────────────────────────────────

export function useChatSafety(content: string): ChatSafetyResult {
  return useMemo(() => {
    if (!content.trim()) {
      return { blocked: false, severe: false, reason: null, warningText: null };
    }

    for (const { pattern, type, severe } of BLOCKED_PATTERNS) {
      if (pattern.test(content)) {
        if (severe) {
          return {
            blocked: true,
            severe: true,
            reason: "grooming_attempt",
            warningText: SEVERE_WARNING,
            matchedPattern: type,
          };
        }
        return {
          blocked: true,
          severe: false,
          reason: type === "off_platform_payment" || type === "off_platform_contact"
            ? "off_platform_contact"
            : "blocked_content",
          warningText: BLOCKED_WARNING,
          matchedPattern: type,
        };
      }
    }

    return { blocked: false, severe: false, reason: null, warningText: null };
  }, [content]);
}

// ─── 5. useBookingTimeline ─────────────────────────────────────────────────

const TIMELINE_DEFINITIONS: Record<string, BookingTimelineStep[]> = {
  default: [
    { key: "requested", label: "Anmodning", description: "Bookingen er oprettet", completed: false, active: false, icon: "📋" },
    { key: "accepted", label: "Godkendt", description: "Kunden har godkendt", completed: false, active: false, icon: "✅" },
    { key: "in_progress", label: "I gang", description: "Arbejdet er i gang", completed: false, active: false, icon: "🔧" },
    { key: "completed", label: "Fuldført", description: "Arbejdet er udført", completed: false, active: false, icon: "🎉" },
  ],
  with_parent: [
    { key: "requested", label: "Anmodning", description: "Bookingen er oprettet", completed: false, active: false, icon: "📋" },
    { key: "awaiting_parent", label: "Afventer forælder", description: "Forældregodkendelse kræves", completed: false, active: false, icon: "👪" },
    { key: "accepted", label: "Godkendt", description: "Kunden har godkendt", completed: false, active: false, icon: "✅" },
    { key: "in_progress", label: "I gang", description: "Arbejdet er i gang", completed: false, active: false, icon: "🔧" },
    { key: "completed", label: "Fuldført", description: "Arbejdet er udført", completed: false, active: false, icon: "🎉" },
  ],
};

export function useBookingTimeline(
  status: string,
  hasParentApproval?: boolean
): { steps: BookingTimelineStep[]; currentStepIndex: number } {
  return useMemo(() => {
    const definitions = hasParentApproval
      ? TIMELINE_DEFINITIONS.with_parent
      : TIMELINE_DEFINITIONS.default;

    const statusOrder = definitions.map((s) => s.key);
    const currentIndex = status === "cancelled" || status === "disputed"
      ? -1
      : statusOrder.indexOf(status);

    const steps = definitions.map((step, i) => ({
      ...step,
      completed: i < currentIndex,
      active: i === currentIndex,
    }));

    return { steps, currentStepIndex: currentIndex };
  }, [status, hasParentApproval]);
}

// ─── 6. useReducedMotionSafe ───────────────────────────────────────────────

export function useReducedMotionSafe() {
  return useMemo(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const safeTransition = prefersReducedMotion
      ? { duration: 0.1, ease: "easeOut" as const }
      : { duration: 0.24, ease: [0.19, 1, 0.22, 1] as [number, number, number, number] };

    const safeAnimation = prefersReducedMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0 };

    const safeInitial = prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 10 };

    return {
      prefersReducedMotion,
      safeTransition,
      safeAnimation,
      safeInitial,
    };
  }, []);
}

// ─── 7. useRiskCopy ────────────────────────────────────────────────────────

export function useRiskCopy({
  job,
  customer,
  helper,
}: {
  job?: any;
  customer?: any;
  helper?: any;
}): { safetyCopy: string; riskLevel: "safe" | "caution" | "warning" } {
  return useMemo(() => {
    if (!job) {
      return { safetyCopy: "Ingen opgaveinformation tilgængelig.", riskLevel: "caution" };
    }

    const parts: string[] = [];

    // Category safety
    const safeCategories = [
      "lawn-mowing", "gardening", "dog-walking", "snow-shoveling",
      "car-washing", "leaf-raking", "outdoor-help", "other-outdoor",
    ];
    const isOutdoor = safeCategories.includes(job.category);
    parts.push(isOutdoor
      ? `Denne opgave er udendørs — ${JOB_CATEGORY_LABELS[job.category] || job.category}`
      : "Denne opgave foregår indendørs");

    // Customer verification
    if (customer) {
      if (customer.isVerified) {
        parts.push("Kunden er MitID-verificeret");
      } else {
        parts.push("⚠️ Kunden er ikke MitID-verificeret");
      }
    }

    // Helper verification
    if (helper) {
      if (helper.isVerified) {
        parts.push("Hjælperen er verificeret");
      } else {
        parts.push("⚠️ Hjælperen er ikke verificeret");
      }
    }

    // Minor helper
    if (helper?.age !== undefined && helper.age < 18) {
      parts.push("Unge under 18 — kun dagtimer (08:00–18:00)");
    }

    // Payment
    parts.push("Betaling foregår sikkert i appen");

    const copy = parts.join(" · ");

    // Determine risk level
    const hasWarning = parts.some((p) => p.includes("⚠️"));
    const isIndoor = !isOutdoor;
    const riskLevel = hasWarning || isIndoor ? "warning" : "safe";

    return { safetyCopy: copy, riskLevel };
  }, [job, customer, helper]);
}
