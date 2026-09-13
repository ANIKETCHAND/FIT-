import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = true,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("fittrack-theme") : null;
    if (stored === "dark" || stored === "light") {
      return stored as Theme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("fittrack-theme", theme);
  }, [theme, switchable]);

  // Default to dark on an explicit sign-in event.
  useEffect(() => {
    const handleSignIn = () => setTheme("dark");
    // Cross-tab: SYNC to the theme another tab chose. Must not force dark here —
    // the app writes localStorage constantly, and a "storage" event fires in
    // other tabs on every such write; forcing dark would clobber light mode.
    const syncFromStorage = (e: StorageEvent) => {
      if (e.key === "fittrack-theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setTheme(e.newValue);
      }
    };

    window.addEventListener("fittrack:signin", handleSignIn);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener("fittrack:signin", handleSignIn);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
