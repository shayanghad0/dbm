import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

/**
 * ExpandableTabs (from ui-master guidelines):
 * - tabs collapse to icons and expand to icon+text when selected
 * - clicking outside collapses any open tab
 * - supports separators between groups
 */
export function ExpandableTabs({ tabs, active, onSelect, className, orientation = "horizontal" }) {
  const [openKey, setOpenKey] = useState(active || null);
  const rootRef = useRef(null);

  useEffect(() => setOpenKey(active || null), [active]);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpenKey(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className={cn("flex items-center gap-1", className)} role="tablist">
      {tabs.map((tab, i) => {
        if (tab.separator) {
          return <span key={`sep-${i}`} className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />;
        }
        const isOpen = openKey === tab.key;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            title={tab.label}
            onMouseEnter={() => setOpenKey(tab.key)}
            onFocus={() => setOpenKey(tab.key)}
            onClick={(e) => {
              e.stopPropagation();
              setOpenKey(tab.key);
              onSelect?.(tab.key, e);
            }}
            className={cn(
              "exp-tab flex h-10 shrink-0 items-center rounded-full border text-sm font-medium outline-none transition-colors",
              isOpen ? "px-3" : "w-10 justify-center px-0",
              isActive
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <tab.icon className={cn("h-4 w-4 shrink-0", tab.danger && "text-destructive")} />
            {isOpen && <span className="ms-1.5 max-w-[9rem] truncate">{tab.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
