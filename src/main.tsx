import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Jobs = lazy(() => import("./pages/Jobs.tsx"));
const JobDetail = lazy(() => import("./pages/JobDetail.tsx"));
const PostJob = lazy(() => import("./pages/PostJob.tsx"));
const Bookings = lazy(() => import("./pages/Bookings.tsx"));
const BookingDetail = lazy(() => import("./pages/BookingDetail.tsx"));
const Conversations = lazy(() => import("./pages/Conversations.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const MitIDSandbox = lazy(() => import("./pages/MitIDSandbox.tsx"));
const MitIDCallback = lazy(() => import("./pages/MitIDCallback.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const HelperDashboard = lazy(() => import("./pages/HelperDashboard.tsx"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    // Only sync route changes if inside an iframe (Freebuff dev mode)
    if (window !== window.parent) {
      window.parent.postMessage(
        { type: "iframe-route-change", path: location.pathname },
        "*",
      );
    }
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

// Verify Convex URL is set before creating client (constructor doesn't throw on invalid URL)
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  document.getElementById("root")!.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FAFAF7;padding:20px;">
      <div style="text-align:center;max-width:400px;">
        <h1 style="font-size:24px;font-weight:700;color:#111;margin-bottom:8px;">Neighborly</h1>
        <p style="color:#666;font-size:14px;line-height:1.5;">
          Backend-URL mangler. Sørg for at VITE_CONVEX_URL er sat som environment variable i Vercel.
        </p>
        <p style="color:#999;font-size:12px;margin-top:12px;">
          Kontakt support@neighborly.dk for hjælp.
        </p>
      </div>
    </div>
  `;
  throw new Error("VITE_CONVEX_URL is not set");
}
const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <RouteSyncer />
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/jobs/new" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
            <Route path="/jobs/:jobId" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/bookings/:bookingId" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
            <Route path="/conversations" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/mitid-sandbox" element={<MitIDSandbox />} />
            <Route path="/mitid-callback" element={<ProtectedRoute><MitIDCallback /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/helper-dashboard" element={<ProtectedRoute><HelperDashboard /></ProtectedRoute>} />
            <Route path="/parent-dashboard" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster />
    </ConvexAuthProvider>
  </StrictMode>,
);
