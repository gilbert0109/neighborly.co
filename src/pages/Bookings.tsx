import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  MapPin,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

export default function Bookings() {
  const navigate = useNavigate();
  const bookings = useQuery(api.bookings.getMyBookings);

  const { active, completed, cancelled } = useMemo(() => {
    if (!bookings)
      return { active: [], completed: [], cancelled: [] };
    return {
      active: bookings.filter(
        (b: any) =>
          b.status === "pending" ||
          b.status === "accepted" ||
          b.status === "in_progress"
      ),
      completed: bookings.filter((b: any) => b.status === "completed"),
      cancelled: bookings.filter((b: any) => b.status === "cancelled"),
    };
  }, [bookings]);

  const isLoading = bookings === undefined;

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black">Mine bookinger</h2>
          <p className="text-muted-foreground mt-1">
            Følg dine opgaver og administrer bookinger
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : bookings && bookings.length === 0 ? (
          <Card className="rounded-none border-2 border-foreground border-dashed bg-muted/50">
            <CardContent className="py-12 text-center">
              <CalendarCheck className="size-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-bold text-muted-foreground">
                Ingen bookinger endnu
              </p>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Find opgaver for at begynde at hjælpe dine naboer, eller opret en
                opgave for at finde hjælp.
              </p>
              <Button
                onClick={() => navigate("/jobs")}
                className="rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
              >
                Find opgaver
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active">
            <TabsList className="rounded-none border-2 border-foreground bg-background h-auto p-0">
              <TabsTrigger
                value="active"
                className="rounded-none border-r-2 border-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
              >
                Aktive ({active.length})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="rounded-none border-r-2 border-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
              >
                Fuldførte ({completed.length})
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
              >
                Annullerede ({cancelled.length})
              </TabsTrigger>
            </TabsList>

            {[
              { value: "active", items: active, empty: "Ingen aktive bookinger" },
              {
                value: "completed",
                items: completed,
                empty: "Ingen fuldførte bookinger",
              },
              {
                value: "cancelled",
                items: cancelled,
                empty: "Ingen annullerede bookinger",
              },
            ].map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {tab.items.length === 0 ? (
                  <Card className="rounded-none border-2 border-foreground border-dashed bg-muted/50">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      {tab.empty}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {tab.items.map((booking: any, i: number) => (
                      <motion.div
                        key={booking._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card
                          className="rounded-none border-2 border-foreground cursor-pointer hover:shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
                          onClick={() =>
                            navigate(`/bookings/${booking._id}`)
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold truncate">
                                    {booking.job?.title || "Opgave"}
                                  </h3>
                                  <Badge
                                    className={`rounded-none border border-foreground text-xs ${STATUS_COLORS[booking.status] || ""}`}
                                  >
                                    {STATUS_LABELS[booking.status] || booking.status}
                                  </Badge>
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                  {booking.job?.description || ""}
                                </p>

                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  {booking.job?.address && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="size-3" />
                                      {booking.job.address}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {new Date(
                                      booking.scheduledDate
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="font-black text-lg">
                                  {booking.price} kr
                                </p>
                                <div className="flex items-center gap-2 justify-end mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {booking.status === "completed" ? (
                                      <CheckCircle className="size-3 inline mr-1 text-green-600" />
                                    ) : booking.status === "cancelled" ? (
                                      <XCircle className="size-3 inline mr-1 text-red-600" />
                                    ) : (
                                      <Clock className="size-3 inline mr-1" />
                                    )}
                                  </span>
                                  {booking.status !== "cancelled" && booking.status !== "completed" && (
                                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                                      <MessageSquare className="size-3" />
                                      Chat
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
