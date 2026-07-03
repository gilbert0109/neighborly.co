import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { JOB_CATEGORY_LABELS } from "@/lib/constants";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";

export default function Jobs() {
  const navigate = useNavigate();
  const jobs = useQuery(api.jobs.listJobs, {});
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    let result = jobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j: any) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          (j.city && j.city.toLowerCase().includes(q))
      );
    }
    if (filterCat) {
      result = result.filter((j: any) => j.category === filterCat);
    }
    return result;
  }, [jobs, search, filterCat]);

  const categories = useMemo(() => {
    if (!jobs) return [];
    const cats = new Set<string>();
    jobs.forEach((j: any) => cats.add(j.category));
    return Array.from(cats);
  }, [jobs]);

  const isLoading = jobs === undefined;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black">Browse Jobs</h2>
            <p className="text-muted-foreground mt-1">
              Find tasks in your neighborhood
            </p>
          </div>
          <Button
            onClick={() => navigate("/jobs/new")}
            className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all shrink-0"
          >
            <Briefcase className="size-4" />
            Post a Job
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, description, or city..."
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
              All
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
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-none border-2 border-foreground border-dashed bg-muted/50">
            <CardContent className="py-12 text-center">
              <Search className="size-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-bold text-muted-foreground">
                No jobs found
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {jobs?.length === 0
                  ? "No one has posted any jobs yet. Be the first!"
                  : "Try adjusting your search or filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((job: any, i: number) => (
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
                      <p className="font-black text-xl shrink-0">
                        {job.price} kr
                      </p>
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
                          {new Date(job.scheduledDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-sm font-semibold text-primary">
                        View
                        <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
