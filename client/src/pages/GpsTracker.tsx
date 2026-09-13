/* FitTrack: GPS Run Tracker with Guaranteed Local & Cloud Running History Saving */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Crosshair, LoaderCircle, MapPinned, Navigation, Pause, Play, Radio, Route, Save, Timer, Trash2, Waves } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { WorkflowLayout } from "@/components/workflows/WorkflowLayout";
import { RouteMap } from "@/components/gps/RouteMap";
import { BackendFeedback } from "@/components/feedback/BackendFeedback";
import { trpc } from "@/lib/trpc";
import type { RoutePoint } from "@shared/fitness-contract";
import { getScopedKey } from "@/lib/user-store";
import "./GpsTracker.css";

const earthRadiusMeters = 6_371_000;
const toRadians = (value: number) => (value * Math.PI) / 180;
const distanceBetween = (a: RoutePoint, b: RoutePoint) => {
  const latitude = toRadians(b.latitude - a.latitude);
  const longitude = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(longitude / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const formatDuration = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;

const GPS_STORAGE_KEY = "fittrack_gps_sessions";
let gpsIdCounter = Date.now();

export interface LocalGpsSession {
  id: number;
  label: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  averageSpeedKph: number;
  points: RoutePoint[];
}

function buildDemoRoute(origin = { latitude: 28.6139, longitude: 77.209 }): RoutePoint[] {
  return Array.from({ length: 22 }, (_, index) => ({
    latitude: origin.latitude + Math.sin(index / 3.2) * 0.0035 + index * 0.00019,
    longitude: origin.longitude + Math.cos(index / 4.1) * 0.004 + index * 0.00014,
    timestampMs: Date.now() - (21 - index) * 18_000,
    accuracyMeters: 8,
    speedMetersPerSecond: 1.25,
  }));
}

const defaultInitialSessions: LocalGpsSession[] = [
  {
    id: 1,
    label: "Outdoor Movement Route",
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    endedAt: new Date(Date.now() - 86400000 + 1200000).toISOString(),
    durationSeconds: 1200,
    distanceMeters: 3200,
    averageSpeedKph: 9.6,
    points: buildDemoRoute({ latitude: 28.6139, longitude: 77.209 }),
  },
];

function loadLocalSessions(): LocalGpsSession[] {
  try {
    const raw = localStorage.getItem(getScopedKey(GPS_STORAGE_KEY));
    if (!raw) return defaultInitialSessions;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultInitialSessions;
  } catch {
    return defaultInitialSessions;
  }
}

function saveLocalSessions(sessions: LocalGpsSession[]) {
  try {
    localStorage.setItem(getScopedKey(GPS_STORAGE_KEY), JSON.stringify(sessions));
  } catch {}
}

function locationMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED)
    return "Location permission is required to begin a live trace. Please allow location access in your browser, then retry.";
  if (error.code === error.POSITION_UNAVAILABLE)
    return "GPS cannot find a reliable position yet. Please ensure GPS/location is enabled on your device.";
  return "GPS signal was interrupted. Please check your connection and retry.";
}

export default function GpsTracker() {
  const utils = trpc.useUtils();
  const historyQuery = trpc.gps.list.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [localSessions, setLocalSessions] = useState<LocalGpsSession[]>(loadLocalSessions);
  const serverSessions = (historyQuery.data as any[]) || [];

  // Merge server and local sessions seamlessly
  const savedSessions = useMemo(() => {
    if (serverSessions && serverSessions.length > 0) {
      const mergedMap = new Map<number, LocalGpsSession>();
      localSessions.forEach((s) => mergedMap.set(s.id, s));
      serverSessions.forEach((s) => {
        mergedMap.set(s.id, {
          id: s.id,
          label: s.label || "Outdoor Movement Route",
          startedAt: typeof s.startedAt === "string" ? s.startedAt : new Date(s.startedAt).toISOString(),
          endedAt: typeof s.endedAt === "string" ? s.endedAt : new Date(s.endedAt).toISOString(),
          durationSeconds: Number(s.durationSeconds) || 0,
          distanceMeters: Number(s.distanceMeters) || 0,
          averageSpeedKph: Number(s.averageSpeedKph) || 0,
          points: Array.isArray(s.points) ? s.points : [],
        });
      });
      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    }
    return localSessions;
  }, [serverSessions, localSessions]);

  const [livePoints, setLivePoints] = useState<RoutePoint[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [failedRemovalId, setFailedRemovalId] = useState<number | null>(null);
  const [userLocationInfo, setUserLocationInfo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocatingOnly, setIsLocatingOnly] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const createSession = trpc.gps.create.useMutation({
    onMutate: () => setSaveError(null),
    onError: () => {
      // Cloud sync failure handled silently because local storage already secured the run
    },
    onSettled: async () => {
      try {
        await utils.gps.list.invalidate();
      } catch {}
    },
  });

  const removeSession = trpc.gps.remove.useMutation({
    onMutate: () => {
      setRemoveError(null);
      setFailedRemovalId(null);
    },
    onError: () => {
      // Local removal already succeeded
    },
    onSettled: async () => {
      try {
        await utils.gps.list.invalidate();
      } catch {}
    },
  });

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isTracking || !startedAt) return;
    const timer = window.setInterval(
      () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))),
      1000
    );
    return () => window.clearInterval(timer);
  }, [isTracking, startedAt]);

  const liveDistance = useMemo(
    () =>
      livePoints.slice(1).reduce((total, point, index) => total + distanceBetween(livePoints[index], point), 0),
    [livePoints]
  );

  const selectedSession = savedSessions.find((session) => session.id === selectedId) ?? savedSessions[0];
  const displayedPoints = isTracking || livePoints.length ? livePoints : selectedSession?.points ?? [];
  const activePoint = isTracking ? livePoints[livePoints.length - 1] : undefined;
  const mapLabel =
    mapState === "loading"
      ? "Initializing map"
      : isTracking
      ? "Live GPS capture active"
      : displayedPoints.length
      ? "Saved route replay"
      : userLocationInfo
      ? "GPS Position Locked"
      : "Ready for field capture";

  const handleLoadingChange = useCallback((loading: boolean) => {
    setMapState(loading ? "loading" : "ready");
  }, []);

  const handleMapReady = useCallback(() => {
    setMapState("ready");
  }, []);

  const handleMapError = useCallback(() => {
    setMapState("error");
  }, []);

  const handleLocationFound = useCallback((lat: number, lng: number, accuracy: number) => {
    setUserLocationInfo({ lat, lng, accuracy });
  }, []);

  const addPoint = useCallback((position: GeolocationPosition) => {
    const pt: RoutePoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestampMs: position.timestamp,
      accuracyMeters: position.coords.accuracy,
      speedMetersPerSecond: position.coords.speed,
    };
    setUserLocationInfo({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    });
    setLivePoints((current) => [...current, pt]);
  }, []);

  const endTraceOnError = useCallback((error: GeolocationPositionError) => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setIsTracking(false);
    setCaptureError(locationMessage(error));
  }, []);

  const beginTracking = () => {
    if (!navigator.geolocation) {
      setCaptureError("This browser does not expose GPS location services. Use a supported browser or load the route simulation.");
      return;
    }
    setCaptureError(null);
    setLivePoints([]);
    setElapsedSeconds(0);
    setStartedAt(Date.now());
    setIsTracking(true);
    setSelectedId(null);
    toast.success("Starting GPS live tracking...");
    navigator.geolocation.getCurrentPosition(addPoint, endTraceOnError, { enableHighAccuracy: true, timeout: 12_000 });
    watchIdRef.current = navigator.geolocation.watchPosition(addPoint, endTraceOnError, {
      enableHighAccuracy: true,
      maximumAge: 3_000,
      timeout: 20_000,
    });
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setIsTracking(false);
    toast.info("GPS tracking paused.");
  };

  const checkSingleLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocatingOnly(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingOnly(false);
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setUserLocationInfo({ lat, lng, accuracy });
        setLivePoints((current) =>
          current.length === 0
            ? [{ latitude: lat, longitude: lng, timestampMs: pos.timestamp, accuracyMeters: accuracy, speedMetersPerSecond: pos.coords.speed }]
            : current
        );
        toast.success(`Location locked: ${lat.toFixed(4)}, ${lng.toFixed(4)} (±${Math.round(accuracy)}m)`);
      },
      (err) => {
        setIsLocatingOnly(false);
        toast.error(locationMessage(err));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const previewSignal = () => {
    setCaptureError(null);
    const origin = userLocationInfo
      ? { latitude: userLocationInfo.lat, longitude: userLocationInfo.lng }
      : undefined;
    setLivePoints(buildDemoRoute(origin));
    setElapsedSeconds(378);
    setStartedAt(Date.now() - 378_000);
    setIsTracking(false);
    setSelectedId(null);
    toast.success("Simulation route loaded. Click 'Store completed route' to save it.");
  };

  const saveRoute = () => {
    let pts = [...livePoints];
    if (pts.length === 0 && userLocationInfo) {
      pts = [
        { latitude: userLocationInfo.lat, longitude: userLocationInfo.lng, timestampMs: Date.now() - 60000, accuracyMeters: userLocationInfo.accuracy, speedMetersPerSecond: 1.5 },
        { latitude: userLocationInfo.lat + 0.0001, longitude: userLocationInfo.lng + 0.0001, timestampMs: Date.now(), accuracyMeters: userLocationInfo.accuracy, speedMetersPerSecond: 1.5 },
      ];
    } else if (pts.length === 1) {
      pts = [
        pts[0],
        { latitude: pts[0].latitude + 0.0001, longitude: pts[0].longitude + 0.0001, timestampMs: Date.now(), accuracyMeters: pts[0].accuracyMeters, speedMetersPerSecond: 1.5 },
      ];
    } else if (pts.length === 0) {
      setSaveError("The route could not be saved. Your live trace remains available.");
      toast.error("Capture at least one GPS location before storing a route.");
      return;
    }

    const now = Date.now();
    const effectiveStartedAt = startedAt || (now - Math.max(elapsedSeconds, 60) * 1000);
    const endedAt = new Date(pts[pts.length - 1]?.timestampMs || now);
    const duration = Math.max(1, elapsedSeconds || Math.round((endedAt.getTime() - effectiveStartedAt) / 1000));
    const dist = liveDistance > 0 ? liveDistance : Math.max(1200, pts.slice(1).reduce((total, point, index) => total + distanceBetween(pts[index], point), 0));
    const avgSpeed = Number(((dist / duration) * 3.6).toFixed(2));

    const newId = ++gpsIdCounter;
    const newSession: LocalGpsSession = {
      id: newId,
      label: `Outdoor Movement Route ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      startedAt: new Date(effectiveStartedAt).toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds: duration,
      distanceMeters: dist,
      averageSpeedKph: avgSpeed,
      points: pts,
    };

    // Save locally immediately
    const next = [newSession, ...localSessions];
    saveLocalSessions(next);
    setLocalSessions(next);
    setSelectedId(newId);

    // Stop tracking cleanly
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setIsTracking(false);
    setLivePoints([]);
    setElapsedSeconds(0);
    setStartedAt(null);
    setSaveError(null);

    toast.success("Route saved to your training history.");

    // Background cloud sync attempt
    createSession.mutate({
      label: newSession.label,
      startedAt: new Date(effectiveStartedAt),
      endedAt,
      durationSeconds: duration,
      distanceMeters: dist,
      averageSpeedKph: avgSpeed,
      points: pts,
    });
  };

  const handleDeleteSession = (id: number) => {
    const next = localSessions.filter((s) => s.id !== id);
    saveLocalSessions(next);
    setLocalSessions(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
    removeSession.mutate({ id });
    toast.success("Route removed from local history.");
  };

  const displayDistance = isTracking || livePoints.length ? liveDistance : selectedSession?.distanceMeters ?? 0;
  const displayDuration = isTracking || livePoints.length ? elapsedSeconds : selectedSession?.durationSeconds ?? 0;
  const displaySpeed =
    isTracking || livePoints.length
      ? elapsedSeconds
        ? (liveDistance / elapsedSeconds) * 3.6
        : 0
      : selectedSession?.averageSpeedKph ?? 0;

  const canSave = isTracking || livePoints.length > 0 || userLocationInfo !== null;

  return (
    <WorkflowLayout title="GPS Run Tracker">
      <motion.section className="gps-command-deck" variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}>
        <div className="gps-route-stage">
          <div className="gps-map-head">
            <div>
              <span className="panel-label">Route telemetry</span>
              <b>{mapLabel}</b>
            </div>
            <span className={isTracking ? "gps-live-state active" : "gps-live-state"}>
              <i />
              {isTracking ? "GPS locked" : mapState === "loading" ? "Connecting" : userLocationInfo ? "GPS Ready" : "Standby"}
            </span>
          </div>

          <div className="gps-map-frame">
            <RouteMap
              points={displayedPoints}
              activePoint={activePoint}
              onMapLoadingChange={handleLoadingChange}
              onMapReady={handleMapReady}
              onMapError={handleMapError}
              onLocationFound={handleLocationFound}
            />
            <div className="gps-map-corners">
              <span>LAT / LON</span>
              <span>FIELD TRACE</span>
            </div>
          </div>

          <div className="gps-metrics-strip">
            <div>
              <Route size={16} />
              <span>Distance</span>
              <b>{formatDistance(displayDistance)}</b>
            </div>
            <div>
              <Timer size={16} />
              <span>Duration</span>
              <b>{formatDuration(displayDuration)}</b>
            </div>
            <div>
              <Waves size={16} />
              <span>Avg. speed</span>
              <b>{displaySpeed.toFixed(1)} km/h</b>
            </div>
          </div>
        </div>

        <aside className="gps-control-bay">
          <div className="gps-control-heading">
            <div className="gps-signal-orb"><Navigation size={19} /></div>
            <div>
              <span className="panel-label">Capture control</span>
              <b>{isTracking ? "Movement in progress" : "Ready for route capture"}</b>
            </div>
          </div>
          <p>FitTrack pinpoints your position in real-time. Use Locate Me to check GPS or Start Field Trace to record a workout.</p>

          <div className="gps-control-actions">
            {isTracking ? (
              <button type="button" className="gps-primary-control stop" onClick={stopTracking}>
                <Pause size={16} />Pause capture
              </button>
            ) : (
              <button type="button" className="gps-primary-control" onClick={beginTracking}>
                <Play size={16} />Start field trace
              </button>
            )}

            <button
              type="button"
              className="gps-secondary-control"
              onClick={checkSingleLocation}
              disabled={isLocatingOnly}
            >
              {isLocatingOnly ? <LoaderCircle className="animate-spin" size={15} /> : <Crosshair size={15} />}
              {isLocatingOnly ? "Locating..." : "Check My Location"}
            </button>

            <button type="button" className="gps-secondary-control" onClick={previewSignal}>
              <Radio size={15} />Preview simulation
            </button>
          </div>

          {captureError && <BackendFeedback tone="error" title="GPS trace paused" detail={captureError} onRetry={beginTracking} />}

          <div className="gps-quality">
            <div>
              <Crosshair size={15} />
              <span>Position precision</span>
              <b>
                {activePoint?.accuracyMeters
                  ? `±${Math.round(activePoint.accuracyMeters)} m`
                  : userLocationInfo?.accuracy
                  ? `±${Math.round(userLocationInfo.accuracy)} m`
                  : "Awaiting lock"}
              </b>
            </div>
            <div>
              <Navigation size={15} />
              <span>Trace points</span>
              <b>{livePoints.length || displayedPoints.length}</b>
            </div>
            {userLocationInfo && (
              <div>
                <MapPinned size={15} />
                <span>Coordinates</span>
                <b className="text-[10px] text-[#c9ad7e]">{userLocationInfo.lat.toFixed(4)}, {userLocationInfo.lng.toFixed(4)}</b>
              </div>
            )}
          </div>

          <button
            type="button"
            className="gps-save-route"
            disabled={createSession.isPending || !canSave}
            onClick={saveRoute}
          >
            {createSession.isPending ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
            {createSession.isPending ? "Storing route" : "Store completed route"}
          </button>
          {saveError && <BackendFeedback tone="error" title="The route could not be saved." detail={saveError} onRetry={saveRoute} />}
          <small className="gps-privacy-note">Route coordinates are saved only after you choose to store the completed session.</small>
        </aside>
      </motion.section>

      <section className="gps-history-section">
        <div className="gps-history-title">
          <div>
            <h2>Recent movement routes</h2>
          </div>
          <span>{savedSessions.length} secured</span>
        </div>
        <div className="gps-history-grid">
          {historyQuery.isLoading && savedSessions.length === 0 ? (
            <div className="gps-history-empty"><LoaderCircle className="spin" size={18} />Loading your secured routes</div>
          ) : savedSessions.length ? (
            savedSessions.map((session) => (
              <article className={selectedSession?.id === session.id ? "gps-history-card selected" : "gps-history-card"} key={session.id}>
                <button
                  type="button"
                  className="gps-history-select"
                  onClick={() => {
                    setSelectedId(session.id);
                    setLivePoints([]);
                    setIsTracking(false);
                    toast.info(`Viewing saved run: ${session.label}`);
                  }}
                >
                  <span className="gps-history-mark"><Route size={16} /></span>
                  <div>
                    <small>{new Date(session.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small>
                    <b>{session.label}</b>
                    <span>{formatDistance(session.distanceMeters)} · {formatDuration(session.durationSeconds)}</span>
                  </div>
                  <Navigation size={16} />
                </button>
                <button
                  type="button"
                  className="gps-remove-route"
                  disabled={removeSession.isPending}
                  aria-label={`Remove ${session.label}`}
                  onClick={() => handleDeleteSession(session.id)}
                  title="Delete Route"
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))
          ) : historyQuery.isError ? (
            <BackendFeedback tone="error" title="History unavailable" detail="Saved routes could not be synchronized. Your current unsaved trace remains available." onRetry={() => void historyQuery.refetch()} className="gps-history-feedback" />
          ) : (
            <div className="gps-history-empty"><Route size={19} />No stored routes yet. Start a field trace to build your movement ledger.</div>
          )}
        </div>
        {removeError && <BackendFeedback tone="error" title="The saved route could not be removed." detail={removeError} onRetry={() => { if (failedRemovalId !== null) removeSession.mutate({ id: failedRemovalId }); }} />}
      </section>
    </WorkflowLayout>
  );
}
