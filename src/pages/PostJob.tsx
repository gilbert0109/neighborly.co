import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { JOB_CATEGORIES } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { CustomerVerificationGate } from "@/components/customer-verification-gate";
import type { ChecklistItem } from "@/components/verification-checklist";

export default function PostJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createJob = useMutation(api.jobs.createJob);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification gate items
  const verificationItems: ChecklistItem[] = [
    { key: "name", label: "Fulde navn", completed: !!user?.name },
    { key: "role", label: "Vælg rolle som kunde", completed: user?.role === "customer" },
    { key: "mitid", label: "MitID-verifikation", completed: !!user?.isVerified },
    { key: "email", label: "E-mail bekræftet", completed: !!user?.email && !user?.isAnonymous },
  ];
  const allVerified = verificationItems.every((i) => i.completed);

  // Helpers can only solve work, not post it. The effect kicks the redirect
  // but it would briefly flash the form on first paint, so we also gate
  // render-time: as soon as we know role === "helper", hide the form.
  // `replace: true` keeps the helper from browser-backing into it.
  useEffect(() => {
    if (user?.role === "helper") {
      toast.error("Hjælpere kan ikke oprette opgaver — skift rolle i din profil.");
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  if (user?.role === "helper") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-pulse text-muted-foreground text-sm">
            Omdirigerer…
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category || !price || !address) {
      toast.error("Udfyld venligst alle påkrævede felter");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Indtast en gyldig pris");
      return;
    }

    setIsSubmitting(true);
    try {
      await createJob({
        title,
        description,
        category: category as any,
        price: Math.round(priceNum * 100), // Konverter til øre
        address,
        city: city || undefined,
        location: { lat: 0, lng: 0 }, // Bemærk: ægte geokodning fra adresse kræves i produktion
        scheduledDate: scheduledDate
          ? new Date(scheduledDate).getTime()
          : undefined,
      });
      toast.success("Opgave oprettet!");
      navigate("/jobs");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke oprette opgave");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <button
          onClick={() => navigate("/jobs")}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Tilbage til opgaver
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Verification gate — show before form if not verified */}
          {!allVerified && (
            <CustomerVerificationGate
              action="oprette en opgave"
              items={verificationItems}
              onContinue={() => navigate("/profile")}
              className="mb-6"
            />
          )}

          <Card className="rounded-2xl border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Opret en ny opgave
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Beskriv en sikker udendørs opgave, så naboer kan byde på den.
              </p>
            </CardHeader>
            <CardContent>
              {/* Disable form if not verified */}
              <div className={!allVerified ? "pointer-events-none opacity-50" : ""}>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">
                      Opgavetitel <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder='F.eks. "Slå min græsplæne"'
                      className="rounded-xl border border-border"
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">
                      Kategori <span className="text-destructive">*</span>
                    </label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-full rounded-xl border border-border">
                        <SelectValue placeholder="Vælg en kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">
                      Beskrivelse <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Beskriv opgaven i detaljer. Størrelse, varighed, særlige forhold..."
                      className="rounded-xl border border-border"
                      rows={4}
                      required
                    />
                  </div>

                  {/* Price & Address row */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">
                        Pris (DKK) <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="200"
                        className="rounded-xl border border-border"
                        min="10"
                        step="10"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Vejledende: 100-500 kr afhængigt af opgaven
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">
                        Planlagt dato
                      </label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="rounded-xl border border-border"
                        min={new Date().toISOString().split("T")[0]}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Lad være tom for fleksibel timing
                      </p>
                    </div>
                  </div>

                  {/* Address row */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">
                        Adresse <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Nørrebrogade 12"
                        className="rounded-xl border border-border"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">
                        By
                      </label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="København"
                        className="rounded-xl border border-border"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !allVerified}
                    className="w-full rounded-xl bg-[var(--trust)] text-white hover:bg-[var(--trust)]/90 shadow-sm transition-all"
                  >
                    <Send className="size-4 mr-2" />
                    {isSubmitting ? "Opretter..." : "Opret opgave"}
                  </Button>
                </form>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <div>
                  <label className="text-sm font-semibold block mb-1.5">
                    Opgavetitel <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='F.eks. "Slå min græsplæne"'
                    className="rounded-xl border border-border"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-semibold block mb-1.5">
                    Kategori <span className="text-destructive">*</span>
                  </label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full rounded-xl border border-border">
                      <SelectValue placeholder="Vælg en kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-semibold block mb-1.5">
                    Beskrivelse <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Beskriv opgaven i detaljer. Størrelse, varighed, særlige forhold..."
                    className="rounded-xl border border-border"
                    rows={4}
                    required
                  />
                </div>

                {/* Price & Address row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">
                      Pris (DKK) <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="200"
                      className="rounded-xl border border-border"
                      min="10"
                      step="10"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Vejledende: 100-500 kr afhængigt af opgaven
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">
                      Planlagt dato
                    </label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="rounded-xl border border-border"
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Lad være tom for fleksibel timing
                    </p>
                  </div>
                </div>

                {/* Address row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">
                      Adresse <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Nørrebrogade 12"
                      className="rounded-xl border border-border"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">
                      By
                    </label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="København"
                      className="rounded-xl border border-border"
                    />
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[var(--trust)] text-white hover:bg-[var(--trust)]/90 shadow-sm transition-all"
                >
                  <Send className="size-4 mr-2" />
                  {isSubmitting ? "Opretter..." : "Opret opgave"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
