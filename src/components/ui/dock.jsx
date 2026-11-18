import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";

/**
 * macOS-style glass dock with magnify hover (from ui-master guidelines).
 * Items expand on hover to show a label bubble above the icon.
 */
export function Dock({ items, active, onSelect, className }) {
  const { t } = useI18n();
  return (
    <nav className={cn("fixed bottom-4 left-1/2 z-50 -translate-x-1/2", className)} aria-label={t("common.dock")}>
      <div className="dock-scroll flex max-w-[min(94vw,720px)] items-end gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/80 px-2 py-2 shadow-dock backdrop-blur-xl dark:bg-zinc-900/70">
        {items.map((item, i) =>
          item.separator ? (
            <span key={`sep-${i}`} className="mx-0.5 h-8 w-px shrink-0 bg-white/15" aria-hidden="true" />
          ) : (
            <DockItem key={item.key} item={item} active={active === item.key} onSelect={onSelect} />
          )
        )}
      </div>
    </nav>
  );
}

function DockItem({ item, active, onSelect }) {
  const [hover, setHover] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setHover(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <button
      ref={ref}
      onClick={() => onSelect?.(item.key)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "dock-item relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-300 outline-none transition-colors",
        active ? "bg-primary/20 text-primary" : "hover:bg-white/10 hover:text-white",
        item.danger && "text-red-400 hover:text-red-300"
      )}
    >
      <item.icon className="h-5 w-5" />
      <span
        className={cn(
          "pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 shadow-lg transition-all duration-200",
          hover ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        )}
      >
        {item.label}
      </span>
      {active && <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-primary" />}
    </button>
  );
}
