import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ShieldCheck, Info, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

export default function MitIDSandbox() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const state = searchParams.get("state") ?? "";
  const redirectUri = searchParams.get("redirect_uri") ?? "/mitid-callback";

  const [cpr, setCpr] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "loading">("form");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) setError("Mangler 'state' parameter. Start venligst forfra fra profilen.");
  }, [state]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;
    setStep("loading");
    setError(null);
    // Simulate MitID auth latency (matches real broker latency ~1.5s).
    setTimeout(() => {
      const mockCode = `SANDBOX_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const url = `${redirectUri}?code=${encodeURIComponent(mockCode)}&state=${encodeURIComponent(state)}`;
      window.location.href = url;
    }, 1400);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1f1f1f]">
      {/* Sandbox banner */}
      <div className="bg-amber-100 border-b-2 border-amber-500">
        <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-2 text-xs text-amber-900">
          <Info className="size-4 shrink-0" />
          <span>
            <strong>Sandbox / Test-miljø</strong> — ikke et rigtigt MitID-login.
            I produktion videresendes du til{" "}
            <span className="font-mono">nemlog-in.dk</span> eller din MitID-broker.
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          {/* MitID red logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-12 h-12 bg-[#c8102e] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-7 h-7 text-white"
                  fill="currentColor"
                  aria-label="MitID"
                >
                  <path d="M9 2h6v6h6v6h-6v6H9v-6H3V8h6V2z" />
                </svg>
              </div>
              <span className="text-3xl font-bold tracking-tight">MitID</span>
            </div>
            <p className="text-sm text-gray-600">Log ind med MitID</p>
          </div>

          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-semibold block mb-1 text-gray-800">
                  Brugernavn eller CPR-nummer
                </label>
                <Input
                  value={cpr}
                  onChange={(e) => setCpr(e.target.value)}
                  placeholder=" fx 010100-1234"
                  className="rounded-none border-2 border-gray-300 h-12 text-base focus:border-[#c8102e]"
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1 text-gray-800">
                  Adgangskode eller pinkode
                </label>
                <Input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Indtast din adgangskode"
                  className="rounded-none border-2 border-gray-300 h-12 text-base focus:border-[#c8102e]"
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-[#c8102e] bg-red-50 border-2 border-[#c8102e] p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={!state || !cpr || !code}
                className="w-full h-12 rounded-none bg-[#c8102e] hover:bg-[#a50d24] text-white font-bold text-base shadow-[0_4px_0_0_#7a0a1a] hover:shadow-[0_2px_0_0_#7a0a1a] hover:translate-y-[2px] transition-all"
              >
                Log ind
                <ArrowRight className="size-4 ml-2" />
              </Button>

              <div className="border-t border-gray-200 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="w-full h-12 rounded-none border-2 border-gray-300 font-semibold text-gray-700"
                >
                  <Smartphone className="size-4 mr-2" />
                  Brug MitID-appen (app-skift)
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Skanner QR-koden med MitID-appen på din telefon.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 flex gap-2">
                <ShieldCheck className="size-4 shrink-0 mt-0.5 text-gray-500" />
                <span>
                  MitID er dit digitale ID. Når du logger ind, kan Neighborly
                  bekræfte din identitet uden at se dine private oplysninger.
                </span>
              </div>

              <p className="text-center text-xs text-gray-500">
                Har du spørgsmål? Kontakt{" "}
                <a className="underline" href="https://mitid.dk" target="_blank" rel="noreferrer">
                  MitID support
                </a>
              </p>
            </form>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 border-4 border-[#c8102e] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-700 font-semibold">
                Bekræfter din identitet…
              </p>
              <p className="text-xs text-gray-500">
                Du bliver sendt tilbage til Neighborly om et øjeblik.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      <footer className="border-t-2 border-gray-200 bg-gray-50 py-4 text-center text-xs text-gray-500">
        MitID er udbudt af{" "}
        <a className="underline" href="https://digst.dk" target="_blank" rel="noreferrer">
          Digitaliseringsstyrelsen
        </a>
        {" · "}
        <button
          onClick={() => navigate("/")}
          className="underline hover:text-[#c8102e]"
        >
          Annullér og gå tilbage
        </button>
      </footer>
    </div>
  );
}
