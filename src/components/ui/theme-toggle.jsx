import React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTheme } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";

/** Animated light/dark toggle (from ui-master guidelines). */
export function ThemeToggle({ className }) {
  const { isDark, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <div
      className={cn(
        "flex h-8 w-16 cursor-pointer rounded-full border p-1 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDark ? "border-zinc-700 bg-zinc-950" : "border-zinc-200 bg-white",
        className
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setTheme(isDark ? "light" : "dark");
      }}
      aria-label={t("common.toggleTheme")}
    >
      <div className="flex w-full items-center justify-between">
        <div className={cn("flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300", isDark ? "bg-zinc-800" : "translate-x-8 bg-zinc-200")}>
          {isDark ? <Moon className="h-4 w-4 text-white" strokeWidth={1.5} /> : <Sun className="h-4 w-4 text-zinc-600" strokeWidth={1.5} />}
        </div>
        <div className={cn("flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300", isDark ? "" : "")}>
          {isDark ? null : <Moon className="h-4 w-4 text-black" strokeWidth={1.5} />}
        </div>
      </div>
    </div>
  );
}
