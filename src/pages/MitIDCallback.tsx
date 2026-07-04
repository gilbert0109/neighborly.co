import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function MitIDCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const complete = useAction(api.mitid.completeMitIDVerification);
  const [error, setError] = useState<string | null>(null);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    // If MitID broker sent back an error (e.g. user cancelled), send to profile.
    if (errorParam) {
      navigate(`/profile?mitid=error&reason=${errorParam}`, { replace: true });
      return;
    }

    if (!code || !state) {
      setError("Manglende parametre i MitID-svaret. Prøv igen.");
      return;
    }

    let cancelled = false;
    complete({ code, state })
      .then(() => {
        if (!cancelled) navigate("/profile?mitid=success", { replace: true });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "MitID-verifikation fejlede.");
      });

    return () => {
      cancelled = true;
    };
  }, [code, state, errorParam, complete, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        {error ? (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#c8102e] mb-4">
              <AlertTriangle className="size-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verifikation fejlede</h1>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/profile", { replace: true })}
              className="bg-[#c8102e] hover:bg-[#a50d24] text-white font-bold px-8 h-12 rounded-none shadow-[0_4px_0_0_#7a0a1a]"
            >
              Tilbage til profil
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#c8102e] mb-4">
              <ShieldCheck className="size-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">MitID bekræfter din identitet</h1>
            <p className="text-sm text-gray-600 mb-6">
              Vi forbinder dit MitID med din Neighborly-profil.
            </p>
            <div className="inline-flex items-center justify-center w-10 h-10 border-4 border-[#c8102e] border-t-transparent rounded-full animate-spin" />
          </>
        )}
      </motion.div>
    </div>
  );
}
