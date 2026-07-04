import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Save,
  Shield,
  User,
  Star,
  Clock,
  CheckCircle,
  MapPin,
  Calendar,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";

// Tiny MitID logo for inline use
function MitIDMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-label="MitID"
    >
      <path d="M9 2h6v6h6v6h-6v6H9v-6H3V8h6V2z" />
    </svg>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const updateProfile = useMutation(api.users.updateProfile);
  const setRole = useMutation(api.users.setRole);
  const startMitID = useMutation(api.mitid.startMitIDVerification);
  const revokeMitID = useMutation(api.mitid.revokeMitIDVerification);
  // Sandbox mode is detected from the authorize URL returned by
  // `startMitIDVerification` (sandbox URLs start with /mitid-sandbox,
  // production URLs are absolute broker URLs). We intentionally do NOT
  // call a separate `getMitIDStatus` query here — the backend function
  // may not be deployed yet, and a missing function on /profile would
  // crash the entire page before the user can use anything else.
  const [mitIDReturnUrl, setMitIDReturnUrl] = useState<string | null>(
    null,
  );
  const setAvailability = useMutation(api.availability.setAvailability);
  const availability = useQuery(api.availability.getMyAvailability);
  const [searchParams, setSearchParams] = useSearchParams();

  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age?.toString() || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [address, setAddress] = useState(user?.address || "");
  const [city, setCity] = useState(user?.city || "");
  const [role, setRoleState] = useState(user?.role || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingMitID, setIsStartingMitID] = useState(false);
  const [isRevokingMitID, setIsRevokingMitID] = useState(false);

  // Handle return from the MitID callback (?mitid=success|error)
  useEffect(() => {
    const mitid = searchParams.get("mitid");
    if (mitid === "success") {
      toast.success("Verificeret med MitID!");
      searchParams.delete("mitid");
      setSearchParams(searchParams, { replace: true });
    } else if (mitid === "error") {
      const reason = searchParams.get("reason");
      toast.error(
        reason === "user_cancelled"
          ? "MitID-verifikation annulleret."
          : `MitID-verifikation fejlede: ${reason || "ukendt fejl"}`,
      );
      searchParams.delete("mitid");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  // Availability state for helpers
  const daysOfWeek = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
  const [availEntries, setAvailEntries] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);
  const [availInitialized, setAvailInitialized] = useState(false);
  const [isSavingAvail, setIsSavingAvail] = useState(false);

  // Sync availability from DB on first load
  useEffect(() => {
    if (availability && !availInitialized) {
      setAvailEntries(availability.map((a) => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime })));
      setAvailInitialized(true);
    }
  }, [availability, availInitialized]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: name || undefined,
        age: age ? parseInt(age) : undefined,
        phone: phone || undefined,
        bio: bio || undefined,
        address: address || undefined,
        city: city || undefined,
      });

      if (role && role !== user?.role) {
        await setRole({ role: role as any });
      }

      toast.success("Profil opdateret!");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke opdatere profil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartMitID = async () => {
    setIsStartingMitID(true);
    try {
      const { url } = await startMitID({ origin: window.location.origin });
      setMitIDReturnUrl(url);
      // Hard navigation — the MitID broker is a separate origin/device.
      window.location.href = url;
    } catch (e: any) {
      toast.error(
        e?.message?.includes("Could not find public function")
          ? "MitID-verifikation er ikke tilgængelig i øjeblikket. Prøv igen senere."
          : e.message || "Kunne ikke starte MitID-flow",
      );
      setIsStartingMitID(false);
    }
  };

  const handleRevokeMitID = async () => {
    if (!window.confirm("Er du sikker på, at du vil frakoble MitID fra din konto?")) {
      return;
    }
    setIsRevokingMitID(true);
    try {
      await revokeMitID();
      toast.success("MitID frakoblet");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke frakoble MitID");
    } finally {
      setIsRevokingMitID(false);
    }
  };

  const handleSaveAvailability = async () => {
    setIsSavingAvail(true);
    try {
      await setAvailability({ entries: availEntries });
      toast.success("Tilgængelighed gemt!");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke gemme tilgængelighed");
    } finally {
      setIsSavingAvail(false);
    }
  };

  const toggleDay = (day: number) => {
    setAvailEntries((prev) => {
      const exists = prev.find((e) => e.dayOfWeek === day);
      if (exists) return prev.filter((e) => e.dayOfWeek !== day);
      return [...prev, { dayOfWeek: day, startTime: "08:00", endTime: "17:00" }];
    });
  };

  const updateTime = (day: number, field: "startTime" | "endTime", value: string) => {
    setAvailEntries((prev) =>
      prev.map((e) => (e.dayOfWeek === day ? { ...e, [field]: value } : e))
    );
  };

  if (user === undefined) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black">Profil</h2>
          <p className="text-muted-foreground mt-1">
            Administrer din konto og indstillinger
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Avatar card */}
          <Card className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-16 rounded-none border-2 border-foreground">
                  <AvatarFallback className="rounded-none text-xl font-black">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xl font-black">
                    {user?.name || "Angiv dit navn"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email || "Ingen e-mail angivet"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="rounded-none border border-foreground">
                      {user?.role === "customer" ? "Kunde" : user?.role === "helper" ? "Hjælper" : user?.role || "Ingen rolle"}
                    </Badge>
                    {user?.isVerified ? (
                      <Badge className="rounded-none border border-foreground bg-green-100 text-green-800">
                        <CheckCircle className="size-3" />
                        Verificeret
                      </Badge>
                    ) : user?.verificationStatus === "pending" ? (
                      <Badge className="rounded-none border border-foreground bg-amber-100 text-amber-800">
                        <Clock className="size-3" />
                        Afventer
                      </Badge>
                    ) : (
                      <Badge className="rounded-none border border-foreground bg-muted text-muted-foreground">
                        Ikke verificeret
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit form */}
          <Card className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)]">
            <CardHeader>
              <CardTitle className="text-lg font-black">
                Rediger profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-sm font-bold block mb-1">
                  Fulde navn
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dit navn"
                  className="rounded-none border-2 border-foreground"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-sm font-bold block mb-1">
                  Rolle
                </label>
                <Select value={role} onValueChange={setRoleState}>
                  <SelectTrigger className="w-full rounded-none border-2 border-foreground">
                    <SelectValue placeholder="Vælg din rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">
                      Kunde — Jeg har brug for hjælp til opgaver
                    </SelectItem>
                    <SelectItem value="helper">
                      Hjælper — Jeg vil udføre opgaver for naboer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold block mb-1">Alder</label>
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                    className="rounded-none border-2 border-foreground"
                    min="13"
                    max="120"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">Telefon</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+45 ..."
                    className="rounded-none border-2 border-foreground"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold block mb-1">
                    Adresse
                  </label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Nørrebrogade 12"
                    className="rounded-none border-2 border-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">By</label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="København"
                    className="rounded-none border-2 border-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold block mb-1">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Fortæl naboerne lidt om dig selv..."
                  className="rounded-none border-2 border-foreground"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Save className="size-4" />
                {isSaving ? "Gemmer..." : "Gem profil"}
              </Button>
            </CardContent>
          </Card>

          {/* MitID verification */}
          {user?.isVerified && user?.mitidVerifiedAt ? (
            <Card className="rounded-none border-2 border-[#c8102e] shadow-[4px_4px_0px_0px_var(--color-foreground)]">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <div className="size-7 bg-[#c8102e] flex items-center justify-center">
                    <MitIDMark className="size-4 text-white" />
                  </div>
                  Verificeret med MitID
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-600">
                  <CheckCircle className="size-5 text-green-700 shrink-0" />
                  <div>
                    <p className="font-bold text-green-900">
                      Identitet bekræftet via MitID
                      {user.mitidAssuranceLevel === "high" && (
                        <span className="ml-2 text-xs bg-green-700 text-white px-1.5 py-0.5 border border-green-900">
                          Høj tillid
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-green-800">
                      {user.mitidName && <>Verificeret som {user.mitidName} · </>}
                      Bekræftet den{" "}
                      {new Date(user.mitidVerifiedAt).toLocaleDateString("da-DK", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Dit MitID er knyttet til denne konto. Det øger tilliden blandt
                  naboer og gør det nemmere at samarbejde i nabolaget.
                </p>
                <Button
                  variant="ghost"
                  onClick={handleRevokeMitID}
                  disabled={isRevokingMitID}
                  className="text-xs text-muted-foreground h-auto p-0 mt-2 hover:bg-transparent"
                >
                  {isRevokingMitID ? "Frakobler..." : "Frakobl MitID og verificér igen"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)]">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Shield className="size-5" />
                  Bliv verificeret med MitID
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Verificér din identitet med MitID — Danmarks officielle
                  digitale ID. Det tager 30 sekunder og skaber tillid blandt
                  naboer.
                </p>
                <Button
                  onClick={handleStartMitID}
                  disabled={isStartingMitID}
                  className="w-full h-12 rounded-none bg-[#c8102e] hover:bg-[#a50d24] text-white font-bold shadow-[0_4px_0_0_#7a0a1a] hover:shadow-[0_2px_0_0_#7a0a1a] hover:translate-y-[2px] transition-all"
                >
                  {isStartingMitID ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Forbinder til MitID...
                    </>
                  ) : (
                    <>
                      <MitIDMark className="size-5 text-white" />
                      Verificér med MitID
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {mitIDReturnUrl && mitIDReturnUrl.startsWith("/mitid-sandbox")
                    ? "Du videresendes til Neighborlys MitID-testmiljø (sandbox)."
                    : "Du videresendes til NemLog-in / din MitID-broker."}
                </p>
                <p className="text-[11px] text-muted-foreground text-center">
                  MitID er udbudt af Digitaliseringsstyrelsen. Vi ser kun dit navn
                  og et unikt ID — aldrig din adgangskode.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          {(user?.averageRating !== undefined ||
            user?.totalReviews !== undefined) && (
            <Card className="rounded-none border-2 border-foreground">
              <CardHeader>
                <CardTitle className="text-lg font-black">Statistik</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xl font-black">
                      <Star className="size-4 fill-accent text-accent" />
                      {user.averageRating?.toFixed(1) || "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bedømmelse
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black">
                      {user.totalReviews || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Anmeldelser
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black">
                      {user.completedJobs || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Udførte opgaver
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Helper Availability */}
          {role === "helper" && (
            <Card className="rounded-none border-2 border-foreground">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Calendar className="size-5" />
                  Ugentlig tilgængelighed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vælg de dage og tidspunkter, du er tilgængelig for at hjælpe naboer.
                </p>
                {daysOfWeek.map((day, i) => {
                  const entry = availEntries.find((e) => e.dayOfWeek === i);
                  const isActive = !!entry;
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleDay(i)}
                        className={`w-12 h-10 text-xs font-bold border-2 border-foreground transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-accent"
                        }`}
                      >
                        {day}
                      </button>
                      {isActive ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={entry.startTime}
                            onChange={(e) => updateTime(i, "startTime", e.target.value)}
                            className="rounded-none border-2 border-foreground w-32"
                          />
                          <span className="text-sm font-bold">–</span>
                          <Input
                            type="time"
                            value={entry.endTime}
                            onChange={(e) => updateTime(i, "endTime", e.target.value)}
                            className="rounded-none border-2 border-foreground w-32"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground flex-1">
                          Ikke tilgængelig
                        </span>
                      )}
                    </div>
                  );
                })}
                <Button
                  onClick={handleSaveAvailability}
                  disabled={isSavingAvail}
                  className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                  variant="outline"
                >
                  <Save className="size-4" />
                  {isSavingAvail ? "Gemmer..." : "Gem tilgængelighed"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Anonymous warning */}
          {user?.isAnonymous && (
            <Card className="rounded-none border-2 border-foreground border-dashed bg-amber-50">
              <CardContent className="p-4 text-sm">
                <p className="font-bold text-amber-800 mb-1">
                  Gæstekonto
                </p>
                <p className="text-amber-700">
                  Du er logget ind som gæst. Opsæt din e-mail og profil for at
                  låse op for alle funktioner og holde din konto sikker.
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
