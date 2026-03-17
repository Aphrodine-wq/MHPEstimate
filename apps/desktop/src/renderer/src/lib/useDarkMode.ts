import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "proestimate_theme";

function getSystemPreference(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyClass(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

function resolve(theme: Theme): boolean {
  if (theme === "system") return getSystemPreference() === "dark";
  return theme === "dark";
}

export function useDarkMode() {
  const [mode, setModeState] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system";
  });

  const setMode = useCallback((next: Theme) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyClass(resolve(next));
  }, []);

  // Apply on mount and when mode changes
  useEffect(() => {
    applyClass(resolve(mode));
  }, [mode]);

  // Listen for OS theme changes when in "system" mode
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyClass(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const isDark = resolve(mode);

  return { mode, setMode, isDark };
}
