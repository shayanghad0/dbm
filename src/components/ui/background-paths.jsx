import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "./button";

function FloatingPaths({ position }) {
  const reduceMotion = useReducedMotion();
  const paths = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 14 * position} -${189 + i * 18}C-${380 - i * 14 * position} -${189 + i * 18} -${312 - i * 14 * position} ${216 - i * 18} ${152 - i * 14 * position} ${343 - i * 18}C${616 - i * 14 * position} ${470 - i * 18} ${684 - i * 14 * position} ${875 - i * 18} ${684 - i * 14 * position} ${875 - i * 18}`,
        width: 0.5 + i * 0.08,
        opacity: 0.08 + i * 0.025,
        duration: 26 + i * 2,
      })),
    [position]
  );

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg className="h-full w-full text-slate-950/40 dark:text-white/25" viewBox="0 0 696 316" fill="none">
        {paths.map((path) =>
          reduceMotion ? (
            <path key={path.id} d={path.d} stroke="currentColor" strokeWidth={path.width} strokeOpacity={path.opacity} />
          ) : (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              initial={{ opacity: path.opacity * 0.6 }}
              animate={{ opacity: [path.opacity * 0.5, path.opacity, path.opacity * 0.5] }}
              transition={{ duration: path.duration, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
          )
        )}
      </svg>
    </div>
  );
}

/** Animated hero background (from ui-master guidelines). */
export function BackgroundPaths({ children }) {
  return (
    <div className="relative min-h-full w-full overflow-hidden bg-background">
      <div className="absolute inset-0 opacity-70">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export { Button };
