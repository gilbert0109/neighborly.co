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
import { useMutation } from "convex/react";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Profile() {
  const { user, signOut } = useAuth();
  const updateProfile = useMutation(api.users.updateProfile);
  const setRole = useMutation(api.users.setRole);
  const requestVerification = useMutation(api.users.requestVerification);

  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age?.toString() || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [address, setAddress] = useState(user?.address || "");
  const [city, setCity] = useState(user?.city || "");
  const [role, setRoleState] = useState(user?.role || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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

      toast.success("Profile updated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestVerification = async () => {
    setIsVerifying(true);
    try {
      await requestVerification();
      toast.success("Verification requested!");
    } catch (e: any) {
      toast.error(e.message || "Failed to request verification");
    } finally {
      setIsVerifying(false);
    }
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
          <h2 className="text-2xl sm:text-3xl font-black">Profile</h2>
          <p className="text-muted-foreground mt-1">
            Manage your account and settings
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
                    {user?.name || "Set your name"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email || "No email set"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="rounded-none border border-foreground">
                      {user?.role || "No role"}
                    </Badge>
                    {user?.isVerified ? (
                      <Badge className="rounded-none border border-foreground bg-green-100 text-green-800">
                        <CheckCircle className="size-3" />
                        Verified
                      </Badge>
                    ) : user?.verificationStatus === "pending" ? (
                      <Badge className="rounded-none border border-foreground bg-amber-100 text-amber-800">
                        <Clock className="size-3" />
                        Pending
                      </Badge>
                    ) : (
                      <Badge className="rounded-none border border-foreground bg-muted text-muted-foreground">
                        Unverified
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
                Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-sm font-bold block mb-1">
                  Full Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-none border-2 border-foreground"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-sm font-bold block mb-1">
                  Role
                </label>
                <Select value={role} onValueChange={setRoleState}>
                  <SelectTrigger className="w-full rounded-none border-2 border-foreground">
                    <SelectValue placeholder="Choose your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">
                      Customer — I need help with tasks
                    </SelectItem>
                    <SelectItem value="helper">
                      Helper — I want to do tasks for neighbors
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold block mb-1">Age</label>
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
                  <label className="text-sm font-bold block mb-1">Phone</label>
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
                    Address
                  </label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Nørrebrogade 12"
                    className="rounded-none border-2 border-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">City</label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Copenhagen"
                    className="rounded-none border-2 border-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold block mb-1">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell neighbors a bit about yourself..."
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
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>

          {/* Verification */}
          {!user?.isVerified && user?.verificationStatus !== "pending" && (
            <Card className="rounded-none border-2 border-foreground">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Shield className="size-5" />
                  Get Verified
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Verification builds trust with neighbors and unlocks all
                  features. It's required for helpers to book jobs.
                </p>
                <Button
                  onClick={handleRequestVerification}
                  disabled={isVerifying}
                  variant="outline"
                  className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                >
                  <Shield className="size-4" />
                  {isVerifying
                    ? "Requesting..."
                    : "Request Verification"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          {(user?.averageRating !== undefined ||
            user?.totalReviews !== undefined) && (
            <Card className="rounded-none border-2 border-foreground">
              <CardHeader>
                <CardTitle className="text-lg font-black">Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xl font-black">
                      <Star className="size-4 fill-accent text-accent" />
                      {user.averageRating?.toFixed(1) || "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rating
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black">
                      {user.totalReviews || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reviews
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black">
                      {user.completedJobs || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Jobs Done
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anonymous warning */}
          {user?.isAnonymous && (
            <Card className="rounded-none border-2 border-foreground border-dashed bg-amber-50">
              <CardContent className="p-4 text-sm">
                <p className="font-bold text-amber-800 mb-1">
                  Guest Account
                </p>
                <p className="text-amber-700">
                  You're signed in as a guest. Set up your email and profile
                  to unlock all features and keep your account safe.
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
