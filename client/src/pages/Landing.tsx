import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Award,
  ChevronRight,
  Dumbbell,
  Fingerprint,
  Flame,
  KeyRound,
  LogIn,
  Moon,
  Quote,
  Sun,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { Landing3DScene } from "@/components/3d/Landing3DScene";
import { FlameButton } from "@/components/ui/flame-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveAthleteProfile, isProfileConfigured, getScopedKey } from "@/lib/user-store";
import { sanitizeText, sanitizeEmail, hashPassword } from "@/lib/sanitize";
import { getSupabaseClient } from "@/lib/supabase";
import "./Landing.css";

const motivatingQuotes = [
  {
    quote: "Consistency is what transforms average effort into excellence.",
    author: "Pro Fitness Coaching",
    tag: "Consistency",
  },
  {
    quote: "What gets measured gets improved.",
    author: "Performance Principle",
    tag: "Performance",
  },
  {
    quote: "Small daily actions compound into lasting physical transformations.",
    author: "Training Wisdom",
    tag: "Discipline",
  },
  {
    quote: "Focus on the process and the results will take care of themselves.",
    author: "Athlete Mindset",
    tag: "Focus",
  },
];

// Production Google OAuth Client ID
const GOOGLE_CLIENT_ID = "583335952268-9ibrvhstkajdn9ik9did17ml3pldijuk.apps.googleusercontent.com";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(() => {
    try {
      const isAuth = localStorage.getItem("fittrack_auth_state") === "authenticated";
      const userEmail = localStorage.getItem("fittrack_user_email") || "";
      const userName = localStorage.getItem("fittrack_user_name") || "Athlete";
      return isAuth ? { email: userEmail, name: userName } : null;
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  // Onboarding setup helper: checks if account already has a configured profile
  const setupOnboardingForUser = (userEmail: string, isNewAccount: boolean) => {
    const hasProfile = isProfileConfigured(userEmail);
    if (!hasProfile || isNewAccount) {
      localStorage.setItem("fittrack_trigger_rexi_welcome", "true");
      sessionStorage.removeItem("fittrack_rexi_welcomed");
    } else {
      localStorage.removeItem("fittrack_trigger_rexi_welcome");
      sessionStorage.setItem("fittrack_rexi_welcomed", "true");
    }
  };

  // Respect the athlete's chosen theme on sign-in; default to dark only if unset.
  const applyDefaultDarkMode = () => {
    try {
      const stored = localStorage.getItem("fittrack-theme");
      if (stored !== "light" && stored !== "dark") {
        localStorage.setItem("fittrack-theme", "dark");
        document.documentElement.classList.add("dark");
      }
    } catch {}
  };

  // After a successful sign-in, send new athletes through onboarding first.
  const proceedAfterAuth = (userEmail: string) => {
    setLocation(isProfileConfigured(userEmail) ? "/overview" : "/onboarding");
  };

  // Decode and cryptographically validate JWT helper for Google One Tap
  const handleCredentialResponse = (response: any) => {
    if (response?.credential) {
      try {
        const base64Url = response.credential.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);

        // Security Validation: verify audience & issuer claims
        if (payload?.aud && payload.aud !== GOOGLE_CLIENT_ID) {
          console.warn("Security Alert: Google JWT audience mismatch.");
          toast.error("Security verification failed. Invalid token audience.");
          return;
        }
        if (payload?.exp && payload.exp < Date.now() / 1000) {
          toast.error("Google session expired. Please sign in again.");
          return;
        }

        const validEmail = sanitizeEmail(payload.email);
        if (validEmail) {
          const cleanName = sanitizeText(payload.name) || "Google Athlete";
          localStorage.setItem("fittrack_auth_state", "authenticated");
          localStorage.setItem("fittrack_auth_provider", "google");
          localStorage.setItem("fittrack_user_email", validEmail);
          localStorage.setItem("fittrack_user_name", cleanName);
          if (payload.picture) {
            localStorage.setItem("fittrack_user_avatar", payload.picture);
          }
          saveAthleteProfile({
            name: cleanName,
            email: validEmail,
            photoDataUrl: payload.picture || "",
            location: "New York, USA",
            focus: "Strength and Conditioning",
          });
          setupOnboardingForUser(validEmail, false);
          applyDefaultDarkMode();
          toast.success(`Welcome, ${cleanName}! Signed in with Google.`);
          setAuthModalOpen(false);
          proceedAfterAuth(validEmail);
        }
      } catch (err) {
        console.error("Failed to decode Google JWT:", err);
      }
    }
  };

  // Trigger Google OAuth2 popup / Token client
  const handleGoogleOAuthPopup = () => {
    const g = (window as any).google;
    if (g?.accounts?.oauth2) {
      try {
        const client = g.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "openid profile email",
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                setIsGoogleLoading(true);
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userData = await res.json();
                if (userData && userData.email) {
                  const googleName = sanitizeText(userData.name) || "Google Athlete";
                  const googleEmailClean = sanitizeEmail(userData.email);

                  localStorage.setItem("fittrack_auth_state", "authenticated");
                  localStorage.setItem("fittrack_auth_provider", "google");
                  localStorage.setItem("fittrack_user_email", googleEmailClean);
                  localStorage.setItem("fittrack_user_name", googleName);
                  if (userData.picture) {
                    localStorage.setItem("fittrack_user_avatar", userData.picture);
                  }
                  saveAthleteProfile({
                    name: googleName,
                    email: googleEmailClean,
                    photoDataUrl: userData.picture || "",
                    location: "New York, USA",
                    focus: "Strength and Conditioning",
                  });
                  setupOnboardingForUser(googleEmailClean, false);
                  applyDefaultDarkMode();
                  setIsGoogleLoading(false);
                  setAuthModalOpen(false);
                  toast.success(`Welcome, ${googleName}! Signed in with Google.`);
                  proceedAfterAuth(googleEmailClean);
                  return;
                }
              } catch (fetchErr) {
                console.error("UserInfo fetch error:", fetchErr);
              } finally {
                setIsGoogleLoading(false);
              }
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (e) {
        console.warn("OAuth2 init fallback:", e);
      }
    }
    // Fallback: Trigger Google One-Tap prompt if available
    if (g?.accounts?.id) {
      g.accounts.id.prompt();
      return;
    }
    toast.error("Google Sign-In is initializing. Please verify popups are enabled for accounts.google.com.");
  };

  // Initialize GSI One Tap & Official buttons
  useEffect(() => {
    const initGoogleGsi = () => {
      const g = (window as any).google;
      if (g?.accounts?.id) {
        try {
          g.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
          });

          if (googleBtnRef.current) {
            g.accounts.id.renderButton(googleBtnRef.current, {
              theme: "outline",
              size: "large",
              text: "continue_with",
              shape: "rectangular",
              width: "100%",
            });
          }
        } catch (e) {
          console.warn("GSI init warning:", e);
        }
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGoogleGsi();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          initGoogleGsi();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  // Cycle motivating quotes automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % motivatingQuotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    // Password-recovery path (local accounts): set the new password hash and sign
    // the athlete back in, preserving their existing profile and logged data.
    if (resetMode) {
      setIsSubmitting(true);
      try {
        const credKey = getScopedKey("fittrack_cred_hash", cleanEmail);
        const newHash = await hashPassword(password);
        localStorage.setItem(credKey, newHash);
        localStorage.setItem("fittrack_auth_state", "authenticated");
        localStorage.setItem("fittrack_user_email", cleanEmail);
        setupOnboardingForUser(cleanEmail, false);
        applyDefaultDarkMode();
        setResetMode(false);
        setAuthModalOpen(false);
        toast.success("Password updated. Welcome back!");
        proceedAfterAuth(cleanEmail);
      } catch (err: any) {
        toast.error(err?.message || "Could not reset your password. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const cleanName = sanitizeText(name) || "Athlete";
    const cleanFocus = sanitizeText(focus) || "Strength and fitness goals";
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        if (authMode === "signup") {
          const { error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                name: cleanName,
                focus: cleanFocus,
              },
            },
          });
          if (error) {
            toast.error(error.message || "Failed to create account in Supabase.");
            setIsSubmitting(false);
            return;
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          });
          if (error) {
            toast.error(error.message || "Invalid email or password.");
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        // Cryptographically secure local authentication fallback
        const credKey = getScopedKey("fittrack_cred_hash", cleanEmail);
        const storedHash = localStorage.getItem(credKey);
        const inputHash = await hashPassword(password);

        if (authMode === "signup") {
          if (storedHash) {
            toast.error("An account already exists for this email. Please sign in instead.");
            setIsSubmitting(false);
            return;
          }
          localStorage.setItem(credKey, inputHash);
        } else {
          if (!storedHash) {
            toast.error("No account found for this email. Please create an account first.");
            setIsSubmitting(false);
            return;
          }
          if (storedHash !== inputHash) {
            toast.error("Incorrect password for this account.");
            setIsSubmitting(false);
            return;
          }
        }
      }

      const hasProfile = isProfileConfigured(cleanEmail);
      localStorage.setItem("fittrack_auth_state", "authenticated");
      localStorage.setItem("fittrack_user_email", cleanEmail);
      if (name) {
        localStorage.setItem("fittrack_user_name", cleanName);
      }
      setupOnboardingForUser(cleanEmail, authMode === "signup");
      applyDefaultDarkMode();

      if (authMode === "signup") {
        saveAthleteProfile({
          name: cleanName,
          email: cleanEmail,
          location: "New York, USA",
          focus: cleanFocus,
        });
        toast.success(`Welcome to FitTrack, ${cleanName.split(" ")[0]}! Let's set up your profile.`);
      } else {
        if (hasProfile) {
          toast.success("Welcome back! Loading your fitness dashboard.");
        } else {
          toast.success("Welcome back! Let's set up your athlete profile.");
        }
      }
      setAuthModalOpen(false);
      proceedAfterAuth(cleanEmail);
    } catch (err: any) {
      toast.error(err?.message || "Authentication error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot-password entry point. Supabase accounts get an emailed reset link;
  // local accounts switch to an inline "set a new password" mode.
  const handleForgotPassword = async () => {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      toast.error("Enter your email above first, then tap Forgot password.");
      return;
    }
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (error) {
          toast.error(error.message || "Could not send the reset email.");
          return;
        }
        toast.success("Password reset link sent. Check your email.");
      } catch (err: any) {
        toast.error(err?.message || "Could not send the reset email.");
      }
      return;
    }
    // Local fallback: let the athlete set a new password; logged data is kept.
    setPassword("");
    setResetMode(true);
    toast.info("Set a new password below to regain access — your logged data stays safe.");
  };

  const handleQuickDemo = () => {
    localStorage.setItem("fittrack_user_email", "demo@fittrack.training");
    localStorage.setItem("fittrack_auth_state", "authenticated");
    localStorage.setItem("fittrack_trigger_rexi_welcome", "true");
          applyDefaultDarkMode();
    toast.success("Welcome! Opening demo dashboard.");
    setLocation("/overview");
  };

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="landing-container">
      {/* 1. 3D Three.js Muscular Back & Particle Universe Background */}
      <Landing3DScene />
      <div className="landing-vignette" />

      {/* 2. Top Navigation Bar */}
      <header className="landing-topbar">
        <div className="landing-topbar-left">
          <div className="landing-brand" onClick={() => setLocation("/")}>
            <div className="brand-logo-icon">
              <Activity size={18} />
            </div>
            <strong>FIT<span>TRACK</span></strong>
          </div>

          {/* Top Sign Up Action Button */}
          <div className="landing-auth-buttons">
            <button
              className="landing-auth-btn signup-btn"
              onClick={() => openAuth("signin")}
              aria-label="Sign In to FitTrack"
            >
              <LogIn size={13} />
              Sign In
            </button>
          </div>
        </div>

        <div className="landing-topbar-right">
          <button
            type="button"
            className="landing-theme-toggle"
            onClick={() => toggleTheme?.()}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      {/* 3. Hero Section */}
      <main className="landing-hero">
        {/* Centered Statements */}
        <motion.h1
          className="hero-main-title text-center mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.1 }}
        >
          BUILD STRENGTH
          <br />
          <span className="hero-title-highlight">TRACK PROGRESS</span>
        </motion.h1>

        {/* Action Button Row: Sign In Tab / Create Account / Demo */}
        {currentUser ? (
          <div className="authenticated-badge-box max-w-md mx-auto mb-10">
            <div className="flex items-center justify-center gap-2 text-[#c6ff3d] font-mono text-xs uppercase tracking-wider font-bold">
              <UserCheck size={16} />
              <span>Session Active</span>
            </div>
            <h3 className="text-lg font-bold text-white font-sans text-center">
              Welcome back, {currentUser.name}!
            </h3>
            <p className="text-xs font-mono text-[#8a998c] text-center">
              {currentUser.email}
            </p>
            <button
              type="button"
              onClick={() => {
                applyDefaultDarkMode();
                if (isProfileConfigured(currentUser.email)) {
                  localStorage.removeItem("fittrack_trigger_rexi_welcome");
                  sessionStorage.setItem("fittrack_rexi_welcomed", "true");
                }
                setLocation("/overview");
              }}
              className="auth-submit-btn w-full flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <span>Launch Dashboard</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("fittrack_auth_state");
                localStorage.removeItem("fittrack_user_email");
                localStorage.removeItem("fittrack_user_name");
                setCurrentUser(null);
                toast.success("Signed out successfully.");
              }}
              className="text-xs font-mono text-[#8a998c] hover:text-white underline mt-2 cursor-pointer block mx-auto text-center"
            >
              Sign Out / Switch Account
            </button>
          </div>
        ) : (
          <div className="hero-cta-group mb-10 flex flex-wrap justify-center items-center gap-4">
            <FlameButton text="Sign In" href="" height={50} textColor="#17110a" borderColor="rgba(0,0,0,0.18)" onClick={() => openAuth("signin")} />
            <FlameButton text="Create Account" href="" height={50} showArrow={false} textColor="#17110a" borderColor="rgba(0,0,0,0.18)" onClick={() => openAuth("signup")} />
          </div>
        )}

        {/* Unique-value trust badges: what sets FitTrack apart from other fitness apps */}
        <div className="hero-trust-badges">
          <span className="hero-trust-badge tb-accent">
            <Activity size={12} /> No Install · Works Offline
          </span>
          <span className="hero-trust-badge">
            🍛 100+ Indian Foods · Hindi Names
          </span>
          <span className="hero-trust-badge tb-accent">
            <Dumbbell size={12} /> Live 3D Muscle Recovery
          </span>
        </div>

        {/* Live Motivating Quotes Ticker Centered */}
        <motion.div
          className="landing-quote-card mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="quote-header">
            <div className="quote-kicker">
              <Quote size={12} />
              <span>Daily Motivation</span>
            </div>
            <span className="quote-author">{motivatingQuotes[quoteIndex].author}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={quoteIndex}
              className="quote-text"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.35 }}
            >
              “<em>{motivatingQuotes[quoteIndex].quote}</em>”
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* 5. Core Platform Pillars */}
        <div className="landing-features-grid">
          <div className="feature-pillar-card">
            <span className="feature-card-index">3D Muscle Activation</span>
            <div className="feature-card-icon">
              <Dumbbell size={20} />
            </div>
            <h3>Interactive Anatomy</h3>
            <p>Rotate a full 3D body, tap any muscle, and see its live recovery readiness — a science-based recovery curve most fitness apps do not offer.</p>
          </div>

          <div className="feature-pillar-card">
            <span className="feature-card-index">Precision Nutrition</span>
            <div className="feature-card-icon">
              <Flame size={20} />
            </div>
            <h3>Smart Macro Targets</h3>
            <p>Built around 100+ Indian foods with Hindi names and raw-ingredient macros, with automatic calorie and protein targets for your exact body and training.</p>
          </div>

          <div className="feature-pillar-card">
            <span className="feature-card-index">Consistency and Streaks</span>
            <div className="feature-card-icon">
              <Award size={20} />
            </div>
            <h3>GPS Logging and Badges</h3>
            <p>Track outdoor routes on live GPS maps that need no paid map key, build unbroken workout streaks, and unlock earned milestone achievements.</p>
          </div>
        </div>
      </main>

      {/* 6. Footer */}
      <footer className="landing-footer">
        <div>
          <span>FitTrack Personal Fitness Platform</span>
        </div>
        <div>
          <span>Designed for dedicated athletes and fitness enthusiasts</span>
        </div>
      </footer>

      {/* 7. Authentication Modal */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="auth-dialog-card sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-wider text-[#eef5eb] font-['Chakra_Petch']">
              {resetMode ? "Reset Password" : authMode === "signin" ? "Sign In" : "Create Account"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8a9b89] font-['Space_Mono']">
              {resetMode
                ? "Choose a new password for your account. Your logged data stays safe."
                : authMode === "signin"
                ? "Sign in to access your workout logs, nutrition targets, and 3D anatomy workspace."
                : "Create your athlete profile and start tracking your fitness journey today."}
            </DialogDescription>
          </DialogHeader>

          <div className="auth-tabs-row">
            <button
              type="button"
              className={`auth-tab-button ${authMode === "signin" ? "active" : ""}`}
              onClick={() => {
                setResetMode(false);
                setAuthMode("signin");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-button ${authMode === "signup" ? "active" : ""}`}
              onClick={() => {
                setResetMode(false);
                setAuthMode("signup");
              }}
            >
              Create Account
            </button>
          </div>

          <div className="auth-form-stack">
            {/* Google Authentication Button */}
            <button
              type="button"
              className="google-auth-btn"
              onClick={handleGoogleOAuthPopup}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div ref={googleBtnRef} className="w-full flex justify-center empty:hidden" />

            <div className="auth-divider">
              <span>Or sign in with email</span>
            </div>

            {typeof window !== "undefined" && window.location.hostname === "localhost" && (
              <p className="text-[11px] text-[#0f172a] text-center font-['Space_Mono'] bg-[#ede4d4] border border-[rgba(180,160,130,0.5)] rounded px-2.5 py-1.5 -mt-1 font-semibold">
                💡 <strong>Localhost Mode:</strong> Use the Email & Password form below to sign in instantly.
              </p>
            )}

            <form onSubmit={handleAuthSubmit} className="auth-form-stack">
              {authMode === "signup" && (
                <div className="auth-input-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    required
                  />
                </div>
              )}

              <div className="auth-input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label>{resetMode ? "New Password" : "Password"}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={resetMode ? "Enter a new password" : "Enter password"}
                  required
                />
                {authMode === "signin" && !resetMode && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="mt-1.5 self-end text-[11px] font-['Space_Mono'] text-[#8a9b89] hover:text-[#c9ad7e] underline underline-offset-2 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
                {resetMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(false);
                      setPassword("");
                    }}
                    className="mt-1.5 self-end text-[11px] font-['Space_Mono'] text-[#8a9b89] hover:text-[#c9ad7e] underline underline-offset-2 transition-colors"
                  >
                    ← Back to sign in
                  </button>
                )}
              </div>

              {authMode === "signup" && !resetMode && (
                <div className="auth-input-group">
                  <label>Primary Fitness Goal</label>
                  <input
                    type="text"
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    placeholder="Strength, Muscle Gain, or Endurance"
                  />
                </div>
              )}

              <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                {resetMode ? <KeyRound size={16} /> : authMode === "signin" ? <LogIn size={16} /> : <UserCheck size={16} />}
                {isSubmitting
                  ? "Verifying..."
                  : resetMode
                  ? "Set New Password"
                  : authMode === "signin"
                  ? "Sign In to Dashboard"
                  : "Create Your Account"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
