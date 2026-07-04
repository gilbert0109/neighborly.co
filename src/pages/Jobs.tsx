import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  Search,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle,
  Plus,
  ClipboardList,
  LogIn,
} from "lucide-react";
import { JOB_CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";

export default function Jobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

  // The two queries are independent — one optimised per role.
  const browseable = useQuery(api.jobs.listJobs, { status: "open" });
  const myJobRows = useQuery(api.jobs.getMyJobsWithBookings, {});

  // Browse filters (only used when role === "helper")
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const filteredBrowse = useMemo(() => {
    if (!browseable) return [];
    let result = browseable;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j: any) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          (j.city && j.city.toLowerCase().includes(q)),
      );
    }
    if (filterCat) {
      result = result.filter((j: any) => j.category === filterCat);
    }
    return result;
  }, [browseable, search, filterCat]);

  const browseCategories = useMemo(() => {
    if (!browseable) return [];
    return Array.from(new Set(browseable.map((j: any) => j.category as string)));
  }, [browseable]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black">
              {role === "customer"
                ? "Mine opgaver"
                : role === "helper"
                  ? "Find opgaver"
                  : "Opgaver"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {role === "customer"
                ? "Dine oprettede opgaver, bookinger og godkendelser."
                : "Find ledige opgaver i dit nabolag."}
            </p>
          </div>
          {role === "customer" ? (
            <Button
              onClick={() => navigate("/jobs/new")}
              className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all shrink-0"
            >
              <Plus className="size-4" />
              Opret opgave
            </Button>
          ) : role === "helper" ? null : (
            // No role picked yet — the body below explains the user must
            // choose a role, so we replace the CTA with the same primary
            // action ("Vælg rolle") to keep the affordance consistent.
            <Button
              onClick={() => navigate("/profile")}
              className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all shrink-0"
            >
              <LogIn className="size-4" />
              Vælg rolle
            </Button>
          )}
        </div>

        {/* Customer view ─────────────────────────────────────────────────── */}
        {role === "customer" ? (
          myJobRows === undefined ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : myJobRows.length === 0 ? (
            <Card className="rounded-none border-2 border-foreground border-dashed bg-muted/50">
              <CardContent className="py-12 text-center">
                <ClipboardList className="size-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-bold text-muted-foreground">
                  Du har ikke oprettet opgaver endnu
                </p>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Opret din første opgave, så finder naboer dig.
                </p>
                <Button
                  onClick={() => navigate("/jobs/new")}
                  className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                >
                  <Plus className="size-4" />
                  Opret opgave
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {myJobRows.map((row: any, i: number) => (
                <CustomerJobCard
                  key={row.job._id}
                  row={row}
                  index={i}
                  onOpen={() => navigate(`/jobs/${row.job._id}`)}
                  onApprove={() => {
                    const pendingId = row.pendingBookings[0]?._id;
                    if (pendingId) navigate(`/bookings/${pendingId}`);
                  }}
                />
              ))}
            </div>
          )
        ) : role === "helper" ? (
          /* Helper view ─────────────────────────────────────────── */
          <HelperBrowseView
            loading={browseable === undefined}
            jobs={filteredBrowse}
            categories={browseCategories}
            search={search}
            setSearch={setSearch}
            filterCat={filterCat}
            setFilterCat={setFilterCat}
          />
        ) : (
          <Card className="rounded-none border-2 border-foreground border-dashed bg-muted/50">
            <CardContent className="py-12 text-center">
              <p className="text-lg font-bold text-muted-foreground">
                Vælg en rolle først
              </p>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Gå til din profil for at vælge "Kunde" eller "Hjælper".
              </p>
              <Button
                onClick={() => navigate("/profile")}
                className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
              >
                Gå til profil
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CustomerJobCard({
  row,
  index,
  onOpen,
  onApprove,
}: {
  row: any;
  index: number;
  onOpen: () => void;
  onApprove: () => void;
}) {
  const { job, pendingBookings, activeBooking, completedCount } = row;
  const hasPending = pendingBookings.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card
        className={`rounded-none border-2 border-foreground transition-all ${
          hasPending
            ? "shadow-[4px_4px_0px_0px_var(--color-primary)] bg-primary/5"
            : "hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:-translate-x-[2px] hover:-translate-y-[2px]"
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className="font-bold text-lg truncate cursor-pointer hover:text-primary"
                  onClick={onOpen}
                >
                  {job.title}
                </h3>
                <Badge
                  className={`rounded-none border border-foreground text-[10px] ${STATUS_COLORS[job.status] || ""}`}
                >
                  {STATUS_LABELS[job.status] || job.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {job.description}
              </p>
            </div>
            <p className="font-black text-xl shrink-0">{job.price} kr</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t-2 border-foreground/10">
            <Badge className="rounded-none border border-foreground bg-accent text-accent-foreground">
              {JOB_CATEGORY_LABELS[job.category] || job.category}
            </Badge>
            {job.address && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3" />
                {job.address}
                {job.city ? `, ${job.city}` : ""}
              </span>
            )}
            {job.scheduledDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                {new Date(job.scheduledDate).toLocaleDateString("da-DK")}
              </span>
            )}
          </div>

          {/* Approval block */}
          {hasPending && (
            <div
              className="mt-4 p-3 bg-primary text-primary-foreground border-2 border-foreground cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              onClick={onApprove}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    Afventer din godkendelse
                  </p>
                  <p className="font-black text-sm mt-0.5">
                    {pendingBookings[0]?.helper?.name || "Nabo"}{" "}
                    vil gerne hjælpe{" "}
                    {new Date(pendingBookings[0]?.scheduledDate).toLocaleDateString("da-DK")}
                  </p>
                </div>
                <ArrowRight className="size-5 shrink-0" />
              </div>
            </div>
          )}

          {/* Active assignment line */}
          {activeBooking && !hasPending && (
            <div className="mt-4 flex items-center justify-between p-3 bg-accent border-2 border-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-700" />
                <p className="text-sm font-semibold">
                  {activeBooking.helper?.name || "Hjælper"} •{" "}
                  {STATUS_LABELS[activeBooking.status] || activeBooking.status}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpen}
                className="h-auto px-2 py-1 text-xs"
              >
                Åbn <ArrowRight className="size-3" />
              </Button>
            </div>
          )}

          {/* Completed summary */}
          {completedCount > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {completedCount} fuldført{completedCount > 1 ? "e" : ""} booking
              {completedCount > 1 ? "er" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HelperBrowseView({
  loading,
  jobs,
  categories,
  search,
  setSearch,
  filterCat,
  setFilterCat,
}: {
  loading: boolean;
  jobs: any[];
  categories: string[];
  search: string;
  setSearch: (v: string) => void;
  filterCat: string | null;
  setFilterCat: (v: string | null) => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            placeholder="Søg efter titel, beskrivelse eller by..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-none border-2 border-foreground"
          />
        </div>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filterCat === null ? "default" : "outline"}
            className="rounded-none cursor-pointer border border-foreground"
            onClick={() => setFilterCat(null)}
          >
            Alle
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={filterCat === cat ? "default" : "outline"}
              className="rounded-none cursor-pointer border border-foreground"
              onClick={() => setFilterCat(filterCat === cat ? null : cat)}
            >
              {JOB_CATEGORY_LABELS[cat] || cat}
            </Badge>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="rounded-none border-2 border-foreground border-dashed bg-muted/50">
          <CardContent className="py-12 text-center">
            <Search className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-bold text-muted-foreground">
              Ingen opgaver fundet
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {categories.length === 0
                ? "Ingen naboer har oprettet opgaver endnu."
                : "Prøv at justere din søgning eller filtre."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {jobs.map((job: any, i: number) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className="rounded-none border-2 border-foreground cursor-pointer hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all group"
                onClick={() => navigate(`/jobs/${job._id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {job.description}
                      </p>
                    </div>
                    <p className="font-black text-xl shrink-0">{job.price} kr</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t-2 border-foreground/10">
                    <Badge className="rounded-none border border-foreground bg-accent text-accent-foreground">
                      {JOB_CATEGORY_LABELS[job.category] || job.category}
                    </Badge>
                    {job.address && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" />
                        {job.address}
                        {job.city ? `, ${job.city}` : ""}
                      </span>
                    )}
                    {job.scheduledDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(job.scheduledDate).toLocaleDateString("da-DK")}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-sm font-semibold text-primary">
                      Se mere
                      <ArrowRight className="size-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
