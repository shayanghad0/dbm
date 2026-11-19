import React from "react";
import { Github } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";

const REPO_URL = "https://github.com/shayanghad0/dbm";

export function AppFooter({ dockVisible = false, className }) {
  const { t } = useI18n();

  return (
    <footer
      className={cn(
        "border-t border-border/60 px-4 pt-4 text-center text-xs text-muted-foreground",
        dockVisible ? "pb-28 sm:pb-24" : "pb-6",
        className
      )}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span>
          {t("footer.madeBy")}{" "}
          <span className="font-medium text-foreground/80">{t("footer.author")}</span>
        </span>
        <span className="text-border" aria-hidden="true">
          ·
        </span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-sm font-medium text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Github className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("footer.repo")}</span>
        </a>
      </div>
    </footer>
  );
}
