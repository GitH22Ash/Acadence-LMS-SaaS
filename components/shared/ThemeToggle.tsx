"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const themes = [
  { value: "light", icon: Sun, label: "Light mode" },
  { value: "dark", icon: Moon, label: "Dark mode" },
  { value: "system", icon: Monitor, label: "System theme" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-0.5 rounded-full bg-muted/60 p-1" aria-hidden>
        {themes.map(({ value }) => (
          <div key={value} className="size-7 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-full bg-muted/60 p-1"
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          onClick={() => setTheme(value)}
          className={`
            relative flex items-center justify-center rounded-full p-1.5
            transition-all duration-200 cursor-pointer
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
            ${theme === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          <Icon className="size-4" strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}
