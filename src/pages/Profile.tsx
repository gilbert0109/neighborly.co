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
import { api, type Id } from "@/convex/_generated/api";
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
import { ParentApprovalCard } from "@/components/parent-approval-card";

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

/** Fetches parent approval for a child user and renders ParentApprovalCard */
function ParentApprovalCardWrapper({ userId }: { userId: Id<"users"> }) {
  const approval = useQuery(api.parentApprovals.getChildApproval, { childId: userId });
  const updatePermissions = useMutation(api.parentApprovals.updateParentPermissions);

  if (approval === undefined) {
    return (
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <ParentApprovalCard
      approval={approval ? {
        childName: approval.childName,
        allowedCategories: approval.allowedCategories || [],
        maxDistanceKm: approval.maxDistanceKm || 5,
        allowedStartTime: approval.allowedStartTime || "08:00",
        allowedEndTime: approval.allowedEndTime || "18:00",
        perJobApproval: approval.perJobApproval || false,
        approved: approval.approved || false,
        paused: approval.paused,
        revokedAt: approval.revokedAt,
        emergencyContactPhone: approval.emergencyContactPhone,
      } : null}
    />
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const updateProfile = useMutation(api.users.updateProfile);
  const setRole = useMutation(api.users.setRole);
  const startMitID = useMutation(api.mitid.startMitIDVerification);
  const revokeMitID = useMutation(api.mitid.revokeMitIDVerification);
  const [mitIDReturnUrl, setMitIDReturnUrl] = useState<string | null>(null);
  const setAvailability = useMutation(api.availability.setAvailability);
  const availability = useQuery(api.availability.getMyAvailability);
  const [searchParams, setSearchParams] = useSearchParams();
  const reviews = useQuery(api.reviews.getUserReviews, user?._id ? { userId: user._id as any } : "skip");

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
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
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
    if (!window.confirm("Er du sikker på, at du vil frakoble MitID fra din konto?")) return;
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
          <h2 className="text-2xl sm:text-3xl font-bold">Profil</h2>
          <p className="text-muted-foreground mt-1">Administrer din konto og indstillinger</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Avatar card */}
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-16 rounded-xl border border-border">
                  <AvatarFallback className="rounded-xl text-xl font-bold bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xl font-bold">{user?.name || "Angiv dit navn"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email || "Ingen e-mail angivet"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="border border-border">
                      {user?.role === "customer" ? "Kunde" : user?.role === "helper" ? "Hjælper" : user?.role || "Ingen rolle"}
                    </Badge>
                    {user?.isVerified ? (
                      <Badge className="border border-[var(--trust)]/30 bg-[var(--trust)]/10 text-[var(--trust)]">
                        <CheckCircle className="size-3" /> Verificeret
                      </Badge>
                    ) : user?.verificationStatus === "pending" ? (
                      <Badge className="border border-amber-300 bg-amber-50 text-amber-700">
                        <Clock className="size-3" /> Afventer
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-border text-muted-foreground">Ikke verificeret</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit form */}
          <Card className="border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Rediger profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-sm font-semibold block mb-1.5">Fulde navn</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dit navn" className="rounded-xl border border-border" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Rolle</label>
                <Select value={role} onValueChange={setRoleState}>
                  <SelectTrigger className="w-full rounded-xl border border-border">
                    <SelectValue placeholder="Vælg din rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Kunde — Jeg har brug for hjælp til opgaver</SelectItem>
                    <SelectItem value="helper">Hjælper — Jeg vil udføre opgaver for naboer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Alder</label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" className="rounded-xl border border-border" min="13" max="120" />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Telefon</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 ..." className="rounded-xl border border-border" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Adresse</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Nørrebrogade 12" className="rounded-xl border border-border" />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1.5">By</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="København" className="rounded-xl border border-border" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Bio</label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Fortæl naboerne lidt om dig selv..." className="rounded-xl border border-border" rows={3} />
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="w-full rounded-xl bg-[var(--trust)] text-white hover:bg-[var(--trust)]/90 shadow-sm">
                <Save className="size-4" /> {isSaving ? "Gemmer..." : "Gem profil"}
              </Button>
            </CardContent>
          </Card>

          {/* MitID verification */}
          {user?.isVerified && user?.mitidVerifiedAt ? (
            <Card className="border border-[var(--safety)]/30 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="size-7 bg-[var(--safety)] rounded-lg flex items-center justify-center">
                    <MitIDMark className="size-4 text-white" />
                  </div>
                  Verificeret med MitID
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 bg-[var(--trust)]/10 border border-[var(--trust)]/30 rounded-xl">
                  <CheckCircle className="size-5 text-[var(--trust)] shrink-0" />
                  <div>
                    <p className="font-semibold text-[var(--trust)]">
                      Identitet bekræftet via MitID
                      {user.mitidAssuranceLevel === "high" && (
                        <span className="ml-2 text-xs bg-[var(--trust)] text-white px-1.5 py-0.5 rounded">Høj tillid</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user.mitidName && <>Verificeret som {user.mitidName} · </>}
                      Bekræftet den {new Date(user.mitidVerifiedAt).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Dit MitID er knyttet til denne konto. Det øger tilliden blandt naboer.</p>
                <Button variant="ghost" onClick={handleRevokeMitID} disabled={isRevokingMitID} className="text-xs text-muted-foreground h-auto p-0 mt-2 hover:bg-transparent">
                  {isRevokingMitID ? "Frakobler..." : "Frakobl MitID og verificér igen"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Shield className="size-5 text-[var(--safety)]" />
                  Bliv verificeret med MitID
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Verificér din identitet med MitID — Danmarks officielle digitale ID.</p>
                <Button onClick={handleStartMitID} disabled={isStartingMitID} className="w-full h-12 rounded-xl bg-[var(--safety)] hover:bg-[var(--safety)]/90 text-white shadow-sm">
                  {isStartingMitID ? (
                    <><Loader2 className="size-4 animate-spin" /> Forbinder til MitID...</>
                  ) : (
                    <><MitIDMark className="size-5 text-white" /> Verificér med MitID</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {mitIDReturnUrl && mitIDReturnUrl.startsWith("/mitid-sandbox")
                    ? "Du videresendes til Neighborlys MitID-testmiljø (sandbox)."
                    : "Du videresendes til NemLog-in / din MitID-broker."}
                </p>
                <p className="text-[11px] text-muted-foreground text-center">MitID er udbudt af Digitaliseringsstyrelsen. Vi ser kun dit navn og et unikt ID.</p>
              </CardContent>
            </Card>
          )}

          {/* Parent Approval (for minors under 18) */}
          {user?.age !== undefined && user.age < 18 && (
            <ParentApprovalCardWrapper userId={user._id as Id<"users">} />
          )}

          {/* Stats */}
          {(user?.averageRating !== undefined || user?.totalReviews !== undefined) && (
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Statistik</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xl font-bold">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      {user.averageRating?.toFixed(1) || "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Bedømmelse</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{user.totalReviews || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Anmeldelser</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{user.completedJobs || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Udførte opgaver</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews list */}
          {reviews && reviews.length > 0 && (
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Star className="size-5 fill-amber-400 text-amber-400" />
                  Anmeldelser af dig
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.map((r: any) => (
                  <div key={r._id} className="border border-border/50 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="size-8 rounded-lg border border-border">
                        <AvatarFallback className="rounded-lg font-bold text-xs bg-muted">
                          {r.reviewer?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {r.reviewer?.name || "Anonym"}
                          <span className="ml-2 text-xs text-muted-foreground font-normal">{r.role === "customer" ? "Kunde" : "Hjælper"}</span>
                        </p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`size-3 ${star <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("da-DK")}</span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">"{r.comment}"</p>}
                    {r.jobTitle && <p className="text-xs text-muted-foreground mt-1">Opgave: {r.jobTitle}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Helper Availability */}
          {role === "helper" && (
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="size-5" />
                  Ugentlig tilgængelighed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Vælg de dage og tidspunkter, du er tilgængelig for at hjælpe naboer.</p>
                {daysOfWeek.map((day, i) => {
                  const entry = availEntries.find((e) => e.dayOfWeek === i);
                  const isActive = !!entry;
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <button onClick={() => toggleDay(i)} className={`w-12 h-10 text-xs font-bold border border-border rounded-lg transition-colors ${isActive ? "bg-[var(--trust)] text-white" : "bg-background hover:bg-accent"}`}>
                        {day}
                      </button>
                      {isActive ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input type="time" value={entry.startTime} onChange={(e) => updateTime(i, "startTime", e.target.value)} className="rounded-lg border border-border w-32" />
                          <span className="text-sm font-bold">–</span>
                          <Input type="time" value={entry.endTime} onChange={(e) => updateTime(i, "endTime", e.target.value)} className="rounded-lg border border-border w-32" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground flex-1">Ikke tilgængelig</span>
                      )}
                    </div>
                  );
                })}
                <Button onClick={handleSaveAvailability} disabled={isSavingAvail} className="rounded-xl border-border" variant="outline">
                  <Save className="size-4" /> {isSavingAvail ? "Gemmer..." : "Gem tilgængelighed"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Anonymous warning */}
          {user?.isAnonymous && (
            <Card className="border border-dashed border-amber-300 bg-amber-50/50">
              <CardContent className="p-4 text-sm">
                <p className="font-semibold text-amber-800 mb-1">Gæstekonto</p>
                <p className="text-amber-700">Du er logget ind som gæst. Opsæt din e-mail og profil for at låse op for alle funktioner.</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
