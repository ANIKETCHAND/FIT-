/* Carbon Command Deck: Settings and Support are full command-center routes with the shared FitTrack shell. */
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { NetworkStatusBanner } from "./components/NetworkStatusBanner";
import { EchoAssistant } from "./components/ai/EchoAssistant";
import { RexiOnboardingModal } from "./components/onboarding/RexiOnboardingModal";
import { RexiGuidedTour } from "./components/onboarding/RexiGuidedTour";
import { autoSyncAthleteLocation } from "./lib/location-resolver";
import { isProfileConfigured } from "./lib/user-store";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import LogFood from "./pages/LogFood";
import LogWorkout from "./pages/LogWorkout";
import LogWeight from "./pages/LogWeight";
import StartSession from "./pages/StartSession";
import Achievements from "./pages/Achievements";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import GpsTracker from "./pages/GpsTracker";
import BodyMap from "./pages/BodyMap";
import Onboarding from "./pages/Onboarding";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const { setTheme } = useTheme();
  const isAuthenticated =
    typeof window !== "undefined" &&
    localStorage.getItem("fittrack_auth_state") === "authenticated";

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    } else {
      const storedTheme = localStorage.getItem("fittrack-theme");
      if (storedTheme !== "light") {
        setTheme("dark");
        document.documentElement.classList.add("dark");
        localStorage.setItem("fittrack-theme", "dark");
      }
    }
  }, [isAuthenticated, setLocation, setTheme]);

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <Component />;
}

function RootRoute() {
  const [, setLocation] = useLocation();
  const isAuthenticated =
    typeof window !== "undefined" &&
    localStorage.getItem("fittrack_auth_state") === "authenticated";

  useEffect(() => {
    if (isAuthenticated) {
      const activeEmail = localStorage.getItem("fittrack_user_email") || "";
      if (isProfileConfigured(activeEmail)) {
        setLocation("/overview");
      }
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) {
    const activeEmail =
      typeof window !== "undefined"
        ? localStorage.getItem("fittrack_user_email") || ""
        : "";
    if (isProfileConfigured(activeEmail)) {
      return <Home />;
    }
  }

  return <Landing />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={RootRoute} />
      <Route path={"/landing"} component={Landing} />
      <Route path={"/onboarding"}>{() => <ProtectedRoute component={Onboarding} />}</Route>
      <Route path={"/overview"}>{() => <ProtectedRoute component={Home} />}</Route>
      <Route path={"/home"}>{() => <ProtectedRoute component={Home} />}</Route>
      <Route path={"/body-map"}>{() => <ProtectedRoute component={BodyMap} />}</Route>
      <Route path={"/anatomy"}>{() => <ProtectedRoute component={BodyMap} />}</Route>
      <Route path={"/log-food"}>{() => <ProtectedRoute component={LogFood} />}</Route>
      <Route path={"/log-workout"}>{() => <ProtectedRoute component={LogWorkout} />}</Route>
      <Route path={"/log-weight"}>{() => <ProtectedRoute component={LogWeight} />}</Route>
      <Route path={"/start-session"}>{() => <ProtectedRoute component={StartSession} />}</Route>
      <Route path={"/achievements"}>{() => <ProtectedRoute component={Achievements} />}</Route>
      <Route path={"/exercise-library"}>{() => <ProtectedRoute component={ExerciseLibrary} />}</Route>
      <Route path={"/notifications"}>{() => <ProtectedRoute component={Notifications} />}</Route>
      <Route path={"/profile"}>{() => <ProtectedRoute component={Profile} />}</Route>
      <Route path={"/settings"}>{() => <ProtectedRoute component={Settings} />}</Route>
      <Route path={"/support"}>{() => <ProtectedRoute component={Support} />}</Route>
      <Route path={"/gps"}>{() => <ProtectedRoute component={GpsTracker} />}</Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Keep the floating Rexi assistant off the dedicated onboarding flow so it stays clean.
function GlobalRexi() {
  const [location] = useLocation();
  if (location.startsWith("/onboarding")) return null;
  return <EchoAssistant />;
}

function App() {
  useEffect(() => {
    // Proactively request and auto-sync athlete location on app initialization
    autoSyncAthleteLocation().catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <AnimatedBackground />
          <NetworkStatusBanner />
          <Toaster />
          <Router />
          <GlobalRexi />
          <RexiOnboardingModal />
          <RexiGuidedTour />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
