import React, { useRef } from "react";
import { cn } from "../../lib/utils";

/**
 * Spotlight glow card (EaseMize-style): a radial glow follows the cursor,
 * hue configurable via the `hue` prop (0-360).
 */
export function SpotlightCard({ children, hue = 250, size = "md", className, onClick, as = "div", ...props }) {
  const ref = useRef(null);
  const Tag = as;

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      onClick={onClick}
      className={cn(
        "spotlight-card group rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
        size === "sm" && "p-3",
        size === "md" && "p-5",
        size === "lg" && "p-7",
        onClick && "cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
