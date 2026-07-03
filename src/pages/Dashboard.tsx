import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import {
  Briefcase,
  CalendarCheck,
  Star,
  Clock,
  ArrowRight,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myJobs = useQuery(api.jobs.getMyJobs);
  const myBookings = useQuery(api.bookings.getMyBookings);

  const isLoading = myJobs === undefined || myBookings === undefined;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  const openJobs = myJobs?.filter((j: any) => j.status === "open") || [];
  const activeBookings =
    myBookings?.filter(
      (b: any) =>
        b.status === "pending" ||
        b.status === "accepted" ||
        b.status === "in_progress"
    ) || [];
  const completedBookings =
    myBookings?.filter((b: any) => b.status === "completed") || [];

  const stats = [
    {
      label: "Open Jobs",
      value: openJobs.length,
      icon: Briefcase,
      color: "text-blue-600",
    },
    {
      label: "Active Bookings",
      value: activeBookings.length,
      icon: CalendarCheck,
      color: "text-amber-600",
    },
    {
      label: "Completed",
      value: completedBookings.length,
      icon: Star,
      color: "text-green-600",
    },
    {
      label: "Rating",
      value: user?.averageRating ? `${user.averageRating}/5` : "—",
      icon: Star,
      color: "text-purple-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl sm:text-3xl font-black">
            Hello{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h2>
          <p className="text-muted-foreground mt-1">
            {user?.role === "helper"
              ? "Ready to help your neighbors today?"
              : "Need something done? Neighbors are ready to help."}
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <stat.icon className={`size-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-black mt-2">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => navigate("/jobs")}
            className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Briefcase className="size-4" />
            Browse Jobs
            <ArrowRight className="size-4" />
          </Button>
          {user?.role === "customer" || !user?.role ? (
            <Button
              onClick={() => navigate("/jobs/new")}
              variant="outline"
              className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Plus className="size-4" />
              Post a Job
            </Button>
          ) : null}
          <Button
            onClick={() => navigate("/bookings")}
            variant="secondary"
            className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <CalendarCheck className="size-4" />
            My Bookings
          </Button>
        </div>

        {/* Active bookings */}
        {activeBookings.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="size-5" />
              Active Bookings
            </h3>
            <div className="space-y-3">
              {activeBookings.slice(0, 3).map((booking: any) => (
                <Card
                  key={booking._id}
                  className="rounded-none border-2 border-foreground cursor-pointer hover:shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
                  onClick={() => navigate(`/bookings/${booking._id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{booking.job?.title || "Job"}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.job?.description?.slice(0, 80)}
                        {(booking.job?.description?.length || 0) > 80
                          ? "..."
                          : ""}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="rounded-none border border-foreground"
                    >
                      {booking.status.replace("_", " ")}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            {activeBookings.length > 3 && (
              <Button
                variant="link"
                onClick={() => navigate("/bookings")}
                className="mt-2"
              >
                View all {activeBookings.length} bookings
                <ArrowRight className="size-3" />
              </Button>
            )}
          </div>
        )}

        {/* Recent jobs */}
        {openJobs.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4">Your Open Jobs</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {openJobs.slice(0, 4).map((job: any) => (
                <Card
                  key={job._id}
                  className="rounded-none border-2 border-foreground cursor-pointer hover:shadow-[3px_3px_0px_0px_var(--color-foreground)] transition-all"
                  onClick={() => navigate(`/jobs/${job._id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{job.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {job.category
                            ?.split("-")
                            .map(
                              (w: string) =>
                                w.charAt(0).toUpperCase() + w.slice(1)
                            )
                            .join(" ")}
                        </p>
                      </div>
                      <p className="font-black text-lg">
                        {job.price} kr
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {activeBookings.length === 0 &&
          openJobs.length === 0 &&
          completedBookings.length === 0 && (
            <Card className="rounded-none border-2 border-foreground border-dashed bg-muted/50">
              <CardContent className="py-12 text-center">
                <p className="text-lg font-bold text-muted-foreground mb-2">
                  Welcome to Neighborly!
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {user?.role === "helper"
                    ? "Browse available jobs in your neighborhood to start helping out."
                    : "Post your first job and find trusted neighbors to help."}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => navigate("/jobs")}
                    className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                  >
                    Browse Jobs
                  </Button>
                  {user?.role !== "helper" && (
                    <Button
                      onClick={() => navigate("/jobs/new")}
                      variant="outline"
                      className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                    >
                      Post a Job
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </DashboardLayout>
  );
}
