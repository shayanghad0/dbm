import React from "react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";

export function Spinner({ className }) {
  const { t } = useI18n();
  return (
    <span
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      role="status"
      aria-label={t("common.loading")}
    />
  );
}

/** Shimmering skeleton block for loading states */
export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
