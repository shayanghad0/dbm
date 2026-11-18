import React from "react";
import { cn } from "../lib/utils";
import { useI18n } from "../lib/i18n";

/** FA / EN pill switcher. */
export function LanguageSwitcher({ className }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={cn("flex h-8 items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold", className)} role="group" aria-label={t("common.language")}>
      {[
        { key: "fa", label: "فا" },
        { key: "en", label: "EN" },
      ].map((l) => (
        <button
          key={l.key}
          onClick={() => setLang(l.key)}
          aria-pressed={lang === l.key}
          className={cn(
            "h-7 rounded-full px-3 transition-colors",
            lang === l.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
