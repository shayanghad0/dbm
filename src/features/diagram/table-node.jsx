import React from "react";
import { KeyRound, Link2, Table2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";

export const NODE_WIDTH = 244;
export const HEADER_H = 42;
export const ROW_H = 27;
export const BODY_PAD = 8;

export function nodeHeight(table) {
  return HEADER_H + Math.max(table.columns.length, 1) * ROW_H + BODY_PAD;
}

export function columnAnchor(table, columnId, side) {
  const idx = Math.max(0, table.columns.findIndex((c) => c.id === columnId));
  return {
    x: table.x + (side === "right" ? NODE_WIDTH : 0),
    y: table.y + HEADER_H + idx * ROW_H + ROW_H / 2,
  };
}

export function TableNode({ table, selected, dragging, onHeaderPointerDown, onColumnClick, onSelect, pendingSource }) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "absolute select-none rounded-xl border bg-card shadow-node transition-shadow",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
        dragging && "z-30 shadow-2xl"
      )}
      style={{ left: table.x, top: table.y, width: NODE_WIDTH, direction: "ltr" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="flex cursor-grab active:cursor-grabbing items-center gap-2 rounded-t-xl border-b border-border bg-muted/60 px-3"
        style={{ height: HEADER_H }}
        onPointerDown={onHeaderPointerDown}
        onDoubleClick={onSelect}
      >
        <span className="flex h-5 w-5 items-center justify-center text-primary">
          <Table2 className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-[13px] font-semibold">{table.name || t("diagram.untitled")}</span>
        <span className="ms-auto text-[10px] text-muted-foreground tnum">{table.columns.length}</span>
      </div>
      <div className="relative py-1">
        {table.columns.length === 0 && (
          <div className="px-3 text-xs italic text-muted-foreground" style={{ height: ROW_H, lineHeight: `${ROW_H}px` }}>
            {t("diagram.noColumns")}
          </div>
        )}
        {table.columns.map((col) => {
          const isPendingSource = pendingSource?.tableId === table.id && pendingSource?.columnId === col.id;
          return (
            <div
              key={col.id}
              className={cn(
                "group/col relative flex items-center gap-1.5 px-3 text-xs transition-colors",
                isPendingSource ? "bg-primary/15 text-primary" : "hover:bg-accent/50"
              )}
              style={{ height: ROW_H }}
              onDoubleClick={onSelect}
            >
              {/* left connector */}
              <button
                type="button"
                aria-label={t("diagram.connect")}
                onClick={(e) => {
                  e.stopPropagation();
                  onColumnClick?.(table, col, "left");
                }}
                className={cn(
                  "connect-dot absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-card opacity-0 transition-opacity group-hover/col:opacity-100",
                  isPendingSource ? "bg-primary opacity-100" : "bg-muted-foreground/60"
                )}
              />
              {col.primaryKey ? (
                <KeyRound className="h-3 w-3 shrink-0 text-amber-500" />
              ) : col.unique ? (
                <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" />
              ) : (
                <span className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">{col.name || <span className="italic text-muted-foreground">{t("diagram.columnPlaceholder")}</span>}</span>
              <span className="ms-auto shrink-0 font-mono text-[9px] text-muted-foreground">
                {col.type}
                {col.length ? `(${col.length})` : ""}
              </span>
              {/* right connector */}
              <button
                type="button"
                aria-label={t("diagram.connect")}
                onClick={(e) => {
                  e.stopPropagation();
                  onColumnClick?.(table, col, "right");
                }}
                className={cn(
                  "connect-dot absolute -right-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-card opacity-0 transition-opacity group-hover/col:opacity-100",
                  isPendingSource ? "bg-primary opacity-100" : "bg-primary/70"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
