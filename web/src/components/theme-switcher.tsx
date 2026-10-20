"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-script";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

const EVENT = "themechange";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage kullanılamıyorsa yalnızca bu oturum için uygula.
  }
  const apply = (window as unknown as { __applyTheme?: () => void }).__applyTheme;
  if (apply) apply();
  else document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  window.dispatchEvent(new Event(EVENT));
}

/** Açık / Koyu / Sistem tema seçici. */
export function ThemeSwitcher({ compact }: { compact?: boolean }) {
  // Sunucuda tercih bilinmez; "system" ile render edilir, tarayıcıda kayıtlı değer okunur.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  return (
    <div role="radiogroup" aria-label="Tema"
      className={`flex rounded-xl border border-line bg-surface-2 p-1 ${compact ? "" : "w-full"}`}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button key={value} type="button" role="radio" aria-checked={active} aria-label={label} title={label}
            onClick={() => setTheme(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12.5px] font-medium transition-colors ${
              compact ? "px-2" : "px-2.5"
            } ${active ? "bg-surface text-fg shadow-soft ring-1 ring-line" : "text-muted hover:text-fg"}`}>
            <Icon className="size-4" strokeWidth={2} />
            {!compact && label}
          </button>
        );
      })}
    </div>
  );
}
