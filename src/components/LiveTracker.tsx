import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  Clock,
  LocateFixed,
  LocateOff,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

interface Props {
  bookingId: string;
  isHelper: boolean;
  isInProgress: boolean;
  jobAddress?: string;
  jobLocation?: { lat: number; lng: number };
  helperName?: string;
}

/** Haversine distance in km */
function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function estimateETA(
  helperLoc: { lat: number; lng: number } | undefined,
  destLoc: { lat: number; lng: number } | undefined,
  speedKmh: number | undefined,
): string {
  if (!helperLoc || !destLoc) return "—";
  const dist = haversine(helperLoc, destLoc);
  const speed = speedKmh && speedKmh > 0 ? speedKmh : 15; // default 15 km/h (bike)
  const hours = dist / speed;
  const mins = Math.round(hours * 60);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}t ${m}m`;
}

export default function LiveTracker({
  bookingId,
  isHelper,
  isInProgress,
  jobAddress,
  jobLocation,
  helperName,
}: Props) {
  const [tracking, setTracking] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const watchId = useRef<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const lastSentRef = useRef<number>(0);

  const updateLocation = useMutation(api.locations.updateLocation);
  const helperLoc = useQuery(
    api.locations.getHelperLocation,
    isInProgress ? { bookingId: bookingId as Id<"bookings"> } : "skip",
  );

  // --- Helper: start / stop location tracking ---
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation ikke understøttet i denne browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {}, // just check permission
      () => toast.error("Tillad lokationsadgang for at dele position"),
    );
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        // Throttle: only send every 10 seconds
        const now = Date.now();
        if (now - lastSentRef.current < 10_000) return;
        lastSentRef.current = now;
        try {
          await updateLocation({
            bookingId: bookingId as Id<"bookings">,
            location: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            },
            heading: pos.coords.heading ?? undefined,
            speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : undefined, // m/s → km/h
          });
        } catch {
          // silently ignore — convex will reject if booking no longer in_progress
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Lokationsadgang nægtet");
          setTracking(false);
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    watchId.current = id;
    setTracking(true);
    toast.success("Live-deling aktiveret");
  }, [bookingId, updateLocation]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
    toast.info("Live-deling stoppet");
  }, []);

  useEffect(() => {
    if (!isInProgress && tracking) {
      stopTracking();
    }
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [isInProgress, tracking, stopTracking]);

  // --- Customer: render map ---
  useEffect(() => {
    if (!showMap || !mapRef.current || isHelper) return;

    const loadMap = async () => {
      const L = (await import("leaflet")).default;
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
      const map = L.map(mapRef.current!).setView([55.6761, 12.5683], 13); // Copenhagen default
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      mapInstance.current = map;
    };
    loadMap();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [showMap, isHelper]);

  // Update markers on map
  useEffect(() => {
    if (!mapInstance.current || !showMap || isHelper) return;
    const loadMarkers = async () => {
      const L = (await import("leaflet")).default;
      const map = mapInstance.current;
      if (!map) return;

      // Clear old markers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
      });

      const points: [number, number][] = [];

      // Helper location
      if (helperLoc?.location) {
        const hLoc: [number, number] = [helperLoc.location.lat, helperLoc.location.lng];
        points.push(hLoc);
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;background:#2563eb;border:3px solid #fff;
            border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            box-shadow:0 2px 6px rgba(0,0,0,.4);
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker(hLoc, { icon }).addTo(map).bindPopup(
          `<b>${helperName || helperLoc.helperName || "Hjælper"}</b><br>Her lige nu`,
        );
      }

      // Job destination
      const dest = jobLocation || helperLoc?.jobLocation;
      if (dest) {
        const dLoc: [number, number] = [dest.lat, dest.lng];
        points.push(dLoc);
        const destIcon = L.divIcon({
          className: "",
          html: `<div style="
            width:24px;height:24px;background:#16a34a;border:3px solid #fff;
            border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4);
            display:flex;align-items:center;justify-content:center;
          "><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        });
        L.marker(dLoc, { icon: destIcon }).addTo(map).bindPopup(
          `<b>Destination</b><br>${jobAddress || helperLoc?.jobAddress || ""}`,
        );
      }

      // Fit bounds
      if (points.length === 1) {
        map.setView(points[0], 15);
      } else if (points.length > 1) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    };
    loadMarkers().catch(() => {});
  }, [helperLoc, showMap, isHelper, jobLocation, jobAddress, helperName]);

  // Compute ETA
  const dest = jobLocation || helperLoc?.jobLocation;
  const eta = estimateETA(helperLoc?.location, dest, helperLoc?.speed);

  // Don't render anything if booking is not in progress
  if (!isInProgress) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="rounded-none border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Navigation className="size-5" />
            {isHelper ? "Live-deling" : "Live tracking"}
            <Badge className="ml-2 rounded-none border border-green-600 bg-green-100 text-green-800 text-[10px]">
              LIVE
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ETA bar */}
          {!isHelper && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 border-2 border-foreground/20">
              <Clock className="size-5 text-primary" />
              <div>
                <p className="text-sm font-bold">
                  {helperLoc?.location
                    ? `${helperName || helperLoc.helperName || "Hjælper"} er på vej`
                    : "Venter på position..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Estimeret ankomst: {eta}
                  {helperLoc?.speed ? ` · ${Math.round(helperLoc.speed)} km/t` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Map (customer only) */}
          {!isHelper && (
            <>
              <AnimatePresence>
                {showMap && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 280, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      ref={mapRef}
                      className="w-full border-2 border-foreground"
                      style={{ height: 280 }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                onClick={() => setShowMap((v) => !v)}
                variant="outline"
                className="w-full rounded-none border-2 border-foreground"
              >
                <MapPin className="size-4" />
                {showMap ? "Skjul kort" : "Vis kort"}
              </Button>
            </>
          )}

          {/* Helper controls */}
          {isHelper && (
            <div className="flex items-center gap-3">
              {!tracking ? (
                <Button
                  onClick={startTracking}
                  className="flex-1 rounded-none border-2 border-foreground shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                >
                  <LocateFixed className="size-4" />
                  Start live-deling
                </Button>
              ) : (
                <Button
                  onClick={stopTracking}
                  variant="outline"
                  className="flex-1 rounded-none border-2 border-foreground"
                >
                  <LocateOff className="size-4" />
                  Stop live-deling
                </Button>
              )}
              {tracking && (
                <div className="flex items-center gap-1 text-sm text-green-700 font-bold">
                  <Loader2 className="size-4 animate-spin" />
                  Deler position
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            {isHelper
              ? "Din position deles kun under denne opgave og kun med kunden."
              : "Hjælperens position vises kun under den aktive opgave."}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
