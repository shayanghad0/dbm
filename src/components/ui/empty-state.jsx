import React from "react";
import { cn } from "../../lib/utils";

/** Empty state block with icon, title, description and optional action. */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-lg px-6 py-12 text-center", className)}>
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div>
        <div className="font-medium">{title}</div>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      {action}
    </div>
  );
}
