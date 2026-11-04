"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const CHANGE_EVENT = "theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Inline script for <head>: applies the saved theme before the first paint,
 * so the page never flashes the wrong colors. Keep in sync with applyTheme().
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("${DARK_QUERY}").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system"; // storage blocked
  }
}

/** Sets the `dark` class (used by the `dark:` variant in globals.css). */
function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" || (theme === "system" && matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage blocked: the theme still applies for this page
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const media = matchMedia(DARK_QUERY);
  // "System" follows the OS setting while the page is open.
  const onSystemChange = () => {
    if (readTheme() === "system") applyTheme("system");
    onChange();
  };
  // Another tab changed the theme.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    applyTheme(readTheme());
    onChange();
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** The chosen theme ("system" during server render). */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "system");
}
