import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import {
  MessageSquare,
  ArrowRight,
  MapPin,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

export default function Conversations() {
  const navigate = useNavigate();
  const conversations = useQuery(api.messages.getMyConversations);
  const { user } = useAuth();

  const isLoading = conversations === undefined;

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary border-2 border-foreground flex items-center justify-center">
            <MessageSquare className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black">Beskeder</h2>
            <p className="text-muted-foreground text-sm">
              Chat med naboer om dine opgaver og bookinger
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-none" />
            ))}
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <Card className="rounded-none border-2 border-foreground border-dashed bg-muted/50">
            <CardContent className="py-16 text-center">
              <MessageSquare className="size-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-bold text-muted-foreground">
                Ingen beskeder endnu
              </p>
              <p className="text-sm text-muted-foreground mt-2 mb-4 max-w-md mx-auto">
                Når en hjælper booker en af dine opgaver, eller når du selv booker en opgave,
                kan I chatte sammen her.
              </p>
              <button
                onClick={() => navigate("/jobs")}
                className="inline-flex items-center gap-2 border-2 border-foreground bg-background px-5 py-2.5 font-bold text-sm shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:shadow-[1px_1px_0px_0px_var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Find opgaver
                <ArrowRight className="size-4" />
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv: any, i: number) => {
              const isClosed =
                conv.booking.status === "cancelled" ||
                conv.booking.status === "completed";
              return (
                <motion.div
                  key={conv.booking._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    className={`rounded-none border-2 border-foreground cursor-pointer hover:shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all ${
                      conv.unreadCount > 0
                        ? "bg-accent/20 border-primary"
                        : ""
                    }`}
                    onClick={() => {
                      navigate(`/bookings/${conv.booking._id}`);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="size-12 shrink-0 bg-accent border-2 border-foreground flex items-center justify-center">
                          <span className="font-bold text-sm">
                            {conv.otherPerson?.name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "?"}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold truncate">
                              {conv.otherPerson?.name || "Nabo"}
                            </h3>
                            {conv.unreadCount > 0 && (
                              <span className="size-2 rounded-full bg-primary shrink-0" />
                            )}
                            <span className="text-xs text-muted-foreground ml-auto shrink-0">
                              {conv.latestMessage
                                ? new Date(
                                    conv.latestMessage.createdAt
                                  ).toLocaleDateString("da-DK", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                : new Date(
                                    conv.booking.createdAt
                                  ).toLocaleDateString("da-DK", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-muted-foreground truncate mb-1">
                            {conv.job?.title || "Opgave"}
                          </p>

                          <div className="flex items-center gap-2">
                            {conv.latestMessage ? (
                              <p className="text-sm text-muted-foreground truncate flex-1">
                                {conv.latestMessage.senderId === user?._id
                                  ? "Du: "
                                  : ""}
                                {conv.latestMessage.isFiltered
                                  ? "[Filtreret besked]"
                                  : conv.latestMessage.content}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Ingen beskeder endnu
                              </p>
                            )}

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                className={`rounded-none border border-foreground text-[10px] ${STATUS_COLORS[conv.booking.status] || ""}`}
                              >
                                {STATUS_LABELS[conv.booking.status] ||
                                  conv.booking.status}
                              </Badge>

                              {conv.unreadCount > 0 && (
                                <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 min-w-5 text-center border border-foreground">
                                  {conv.unreadCount}
                                </span>
                              )}

                              {isClosed ? (
                                conv.booking.status === "completed" ? (
                                  <CheckCircle className="size-4 text-green-600" />
                                ) : (
                                  <XCircle className="size-4 text-red-600" />
                                )
                              ) : (
                                <ArrowRight className="size-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {conv.job?.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
                              <MapPin className="size-3" />
                              {conv.job.address}
                              {conv.job.city ? `, ${conv.job.city}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
