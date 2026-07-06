import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  CalendarCheck,
  User,
  LogOut,
  Wrench,
  MessageSquare,
  ClipboardList,
  Shield,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

// Nav items are split by role — customers shouldn't see "Find opgaver", and
// helpers shouldn't see "Opret opgave".
const allNavItems = {
  customer: [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/jobs/new", label: "Opret opgave", icon: PlusCircle },
    { path: "/bookings", label: "Bookinger", icon: ClipboardList },
    { path: "/conversations", label: "Beskeder", icon: MessageSquare },
    { path: "/profile", label: "Profil", icon: User },
  ],
  helper: [
    { path: "/helper-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/jobs", label: "Find opgaver", icon: Briefcase },
    { path: "/bookings", label: "Bookinger", icon: ClipboardList },
    { path: "/conversations", label: "Beskeder", icon: MessageSquare },
    { path: "/profile", label: "Profil", icon: User },
  ],
  admin: [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin", label: "Admin", icon: Shield },
    { path: "/profile", label: "Profil", icon: User },
  ],
} as const;

function getNavItems(user: any) {
  if (user?.role === "admin") return allNavItems.admin;
  if (user?.role === "helper") return allNavItems.helper;
  // customer or no role
  const age = user?.age;
  const isMinor = age !== undefined && age < 18;
  if (isMinor) {
    return [
      { path: "/parent-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/jobs", label: "Find opgaver", icon: Briefcase },
      { path: "/bookings", label: "Bookinger", icon: ClipboardList },
      { path: "/conversations", label: "Beskeder", icon: MessageSquare },
      { path: "/profile", label: "Profil", icon: User },
    ];
  }
  return allNavItems.customer;
}

function matchCurrentPath(
  pathname: string,
  items: ReadonlyArray<{ path: string; label: string }>,
): string | undefined {
  for (const item of items) {
    if (pathname === item.path) return item.label;
  }
  for (const item of items) {
    if (pathname.startsWith(item.path + "/")) return item.label;
  }
  return undefined;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const totalUnread = useQuery(api.messages.getTotalUnreadCount);

  // Pick role-appropriate nav. Users without a role fall back to "customer"
  // (the safer default — they shouldn't see "Find opgaver" CTAs before
  // they're committed to being a helper).
  const navItems = getNavItems(user);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
            >
              <div className="size-8 bg-[var(--trust)] flex items-center justify-center rounded-lg">
                <Wrench className="size-4 text-white" />
              </div>
              <span>Neighborly</span>
            </button>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item: any) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/dashboard" &&
                    location.pathname.startsWith(item.path + "/") &&
                    !navItems.some(
                      (other) =>
                        other.path !== item.path &&
                        other.path.length > item.path.length &&
                        location.pathname.startsWith(other.path)
                    ));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "cursor-pointer rounded-lg",
                        isActive && "border border-border bg-accent"
                      )}
                    >
                      <item.icon className="size-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.path === "/conversations" &&
                        totalUnread !== undefined &&
                        totalUnread > 0 && (
                          <span className="bg-[var(--trust)] text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center rounded-full leading-none">
                            {totalUnread > 99 ? "99+" : totalUnread}
                          </span>
                        )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="size-8 rounded-lg border border-border">
                <AvatarFallback className="rounded-lg text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">
                  {user?.name || "Nabo"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role === "customer" ? "Kunde" : user?.role === "helper" ? "Hjælper" : user?.role || "Indlæser..."}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full rounded-lg border border-border"
            >
              <LogOut className="size-3 mr-1.5" />
              Log ud
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
            <SidebarTrigger className="rounded-lg border border-border" />
            <h1 className="font-bold text-lg truncate">
              {matchCurrentPath(location.pathname, navItems as ReadonlyArray<{ path: string; label: string }>) || "Neighborly"}
            </h1>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
