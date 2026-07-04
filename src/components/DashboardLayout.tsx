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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/jobs/new", label: "Opret opgave", icon: PlusCircle },
  { path: "/jobs", label: "Find opgaver", icon: Briefcase },
  { path: "/bookings", label: "Mine bookinger", icon: CalendarCheck },
  { path: "/profile", label: "Profil", icon: User },
];

function matchCurrentPath(pathname: string): string | undefined {
  for (const item of navItems) {
    if (pathname === item.path) return item.label;
  }
  for (const item of navItems) {
    if (pathname.startsWith(item.path + "/")) return item.label;
  }
  return undefined;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
        <Sidebar className="border-r-2 border-foreground">
          <SidebarHeader className="p-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
            >
              <div className="size-8 bg-primary flex items-center justify-center rounded-none">
                <Wrench className="size-4 text-primary-foreground" />
              </div>
              <span>Neighborly</span>
            </button>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => {
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
                        "cursor-pointer rounded-none",
                        isActive && "border-2 border-foreground bg-accent"
                      )}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t-2 border-foreground p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="size-8 rounded-none border-2 border-foreground">
                <AvatarFallback className="rounded-none text-xs font-bold">
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
              className="w-full rounded-none border-2 border-foreground"
            >
              <LogOut className="size-3" />
              Log ud
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col">
          <header className="h-14 border-b-2 border-foreground flex items-center px-4 gap-3 shrink-0">
            <SidebarTrigger className="rounded-none border-2 border-foreground" />
            <h1 className="font-bold text-lg truncate">
              {matchCurrentPath(location.pathname) || "Neighborly"}
            </h1>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
