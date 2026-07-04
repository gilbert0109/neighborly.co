import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Wrench, Briefcase, Sparkles, ArrowRight, Loader2 } from "lucide-react";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const setRole = useMutation(api.users.setRole);
  const [isSetting, setIsSetting] = useState(false);

  // If user already has a role, skip to dashboard
  useEffect(() => {
    if (user?.role) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSelectRole = async (role: "customer" | "helper") => {
    setIsSetting(true);
    try {
      await setRole({ role });
      navigate("/dashboard", { replace: true });
    } catch (e) {
      console.error("Failed to set role:", e);
      setIsSetting(false);
    }
  };

  if (!user || user.role) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-2 font-bold text-lg">
          <div className="size-8 bg-primary flex items-center justify-center rounded-none">
            <Wrench className="size-4 text-primary-foreground" />
          </div>
          Neighborly
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl"
        >
          {/* Welcome */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-accent border-2 border-foreground px-4 py-1.5 mb-6"
            >
              <Sparkles className="size-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Velkommen til Neighborly
              </span>
            </motion.div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              Hvordan vil du bruge Neighborly?
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Vælg din rolle — du kan altid ændre den senere i dine indstillinger.
            </p>
          </div>

          {/* Role cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Card
                className={`rounded-none border-2 border-foreground cursor-pointer transition-all hover:shadow-[6px_6px_0px_0px_var(--color-foreground)] hover:-translate-x-[2px] hover:-translate-y-[2px] ${isSetting ? "pointer-events-none opacity-60" : ""}`}
                onClick={() => !isSetting && handleSelectRole("customer")}
              >
                <CardContent className="p-8 text-center">
                  <div className="size-16 bg-primary border-2 border-foreground flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="size-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-black mb-3">Jeg vil lave opgaver</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    Har du brug for hjælp til græsslåning, snerydning, flytning
                    eller noget andet? Opret en opgave, og find en betroet nabo
                    til at løse den.
                  </p>
                  <Button
                    disabled={isSetting}
                    className="w-full rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    {isSetting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    {isSetting ? "Vælger..." : "Vælg Kunde"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <Card
                className={`rounded-none border-2 border-foreground cursor-pointer transition-all hover:shadow-[6px_6px_0px_0px_var(--color-foreground)] hover:-translate-x-[2px] hover:-translate-y-[2px] ${isSetting ? "pointer-events-none opacity-60" : ""}`}
                onClick={() => !isSetting && handleSelectRole("helper")}
              >
                <CardContent className="p-8 text-center">
                  <div className="size-16 bg-accent border-2 border-foreground flex items-center justify-center mx-auto mb-6">
                    <Wrench className="size-8" />
                  </div>
                  <h2 className="text-2xl font-black mb-3">Jeg vil løse opgaver</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    Vil du tjene penge ved at hjælpe dine naboer? Find opgaver i
                    dit område, book dem, og gør en forskel i dit nabolag.
                  </p>
                  <Button
                    disabled={isSetting}
                    variant="outline"
                    className="w-full rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    {isSetting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    {isSetting ? "Vælger..." : "Vælg Hjælper"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Du kan ændre din rolle når som helst under Profil-indstillinger.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
