import React from "react";
import { columnAnchor } from "./table-node";

/** Compute a smooth bezier path between two column anchors. */
export function buildPath(from, to) {
  const dx = Math.max(48, Math.abs(to.x - from.x) / 2);
  const c1x = from.x + (to.x >= from.x ? dx : -dx);
  const c2x = to.x - (to.x >= from.x ? dx : -dx);
  return {
    d: `M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`,
    mid: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
  };
}

/** SVG layer: relation curves, pending link and selection hit areas. */
export function RelationsLayer({ schema, selectedId, onSelect, pending }) {
  return (
    <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="4000" height="3000" aria-hidden="true">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>

      {(schema.relations || []).map((r) => {
        const st = schema.tables.find((t) => t.id === r.sourceTable);
        const tt = schema.tables.find((t) => t.id === r.targetTable);
        if (!st || !tt) return null;
        const from = columnAnchor(st, r.sourceColumn, "right");
        const to = columnAnchor(tt, r.targetColumn, "left");
        const { d, mid } = buildPath(from, to, r);
        const active = selectedId === r.id;
        const color = active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
        return (
          <g key={r.id} className="text-muted-foreground">
            {/* hit area */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth="14"
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(r.id);
              }}
            />
            <path
              d={d}
              fill="none"
              stroke={active ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.28)"}
              strokeWidth={active ? 2.5 : 1.6}
              markerEnd="url(#arrow)"
              style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.28)" }}
            />
            <g className="pointer-events-none">
              <rect x={from.x + 6} y={from.y - 9} width="18" height="16" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
              <text x={from.x + 15} y={from.y + 3} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontWeight="600">
                {r.type === "n-m" ? "*" : r.type === "n-1" ? "*" : "1"}
              </text>
              <rect x={to.x - 24} y={to.y - 9} width="18" height="16" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
              <text x={to.x - 15} y={to.y + 3} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontWeight="600">
                {r.type === "n-m" ? "*" : r.type === "1-1" ? "1" : r.type === "n-1" ? "1" : "*"}
              </text>
            </g>
            {active && (
              <g className="pointer-events-auto">
                <circle cx={mid.x} cy={mid.y} r="12" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" className="cursor-pointer" onClick={() => onSelect(r.id)} />
                <circle cx={mid.x} cy={mid.y} r="4" fill="hsl(var(--primary))" />
              </g>
            )}
          </g>
        );
      })}

      {pending && pending.to && (
        <path
          d={buildPath(pending.from, pending.to).d}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="6 5"
          markerEnd="url(#arrow)"
          style={{ color: "hsl(var(--primary))" }}
        />
      )}
    </svg>
  );
}
