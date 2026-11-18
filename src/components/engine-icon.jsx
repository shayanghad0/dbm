import React from "react";
import { Database, Layers, KeyRound, Table2, GitBranch, Boxes, Network, Zap, Flame, Leaf, Globe, Hexagon, Share2 } from "lucide-react";
import { cn } from "../lib/utils";

/** Per-engine brand color + glyph (all SVG via lucide). */
const GLYPHS = {
  mysql: Database,
  postgresql: Layers,
  sqlite: Zap,
  mariadb: Database,
  mssql: Hexagon,
  oracle: Flame,
  mongodb: Leaf,
  redis: Zap,
  firebase: Flame,
  supabase: Zap,
  dynamodb: Boxes,
  cassandra: Network,
  neo4j: Share2,
};

const DEFAULT_GLYPH = Database;

export function EngineIcon({ engine, size = "md", className, glyph: GlyphOverride }) {
  const Glyph = GlyphOverride || GLYPHS[engine?.id] || DEFAULT_GLYPH;
  const sizes = {
    xs: "h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5",
    sm: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
    md: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
    lg: "h-14 w-14 [&_svg]:h-7 [&_svg]:w-7",
    xl: "h-20 w-20 [&_svg]:h-10 [&_svg]:w-10",
  };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", sizes[size] || sizes.md, className)}
      style={{ color: engine?.color || "hsl(var(--primary))" }}
      aria-hidden="true"
    >
      <Glyph strokeWidth={2} />
    </span>
  );
}

export function EngineGlyph({ id, className }) {
  const Glyph = GLYPHS[id] || DEFAULT_GLYPH;
  return <Glyph className={className} />;
}
