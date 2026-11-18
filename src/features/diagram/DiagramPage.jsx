import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GitBranch, Maximize2, Minus, MousePointerClick, Pencil, Plus, Table2, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { EmptyState } from "../../components/ui/empty-state";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { useBuilder } from "../builder/BuilderContext";
import { RelationEditor } from "../builder/relation-editor";
import { TableNode, columnAnchor, nodeHeight, NODE_WIDTH } from "./table-node";
import { RelationsLayer, buildPath } from "./relations-layer";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function DiagramPage({ navigate }) {
  const { t } = useI18n();
  const { schema, engine, hasSchema, addTable, setTablePos, setSelectedTableId, addRelation, updateRelation, deleteRelation } = useBuilder();

  const canvasRef = useRef(null);
  const [view, setView] = useState({ x: 60, y: 40, zoom: 1 });
  const [pan, setPan] = useState(null);
  const [drag, setDrag] = useState(null);
  const [pending, setPending] = useState(null);
  const [selectedRelId, setSelectedRelId] = useState(null);
  const [relationDraft, setRelationDraft] = useState(null);
  const [confirmDeleteRel, setConfirmDeleteRel] = useState(null);
  const didFit = useRef(false);

  const tables = schema?.tables || [];
  const relations = schema?.relations || [];

  const toWorld = useCallback(
    (clientX, clientY) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left - view.x) / view.zoom, y: (clientY - rect.top - view.y) / view.zoom };
    },
    [view]
  );

  /* ---------- fit view ---------- */
  const fitView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || tables.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const tb of tables) {
      minX = Math.min(minX, tb.x);
      minY = Math.min(minY, tb.y);
      maxX = Math.max(maxX, tb.x + NODE_WIDTH);
      maxY = Math.max(maxY, tb.y + nodeHeight(tb));
    }
    const pad = 70;
    const bw = Math.max(120, maxX - minX);
    const bh = Math.max(120, maxY - minY);
    const zoom = clamp(Math.min((rect.width - pad * 2) / bw, (rect.height - pad * 2) / bh), 0.3, 1.1);
    setView({
      zoom,
      x: (rect.width - bw * zoom) / 2 - minX * zoom,
      y: (rect.height - bh * zoom) / 2 - minY * zoom + 10,
    });
  }, [tables]);

  useEffect(() => {
    if (!didFit.current && tables.length > 0) {
      didFit.current = true;
      const id = requestAnimationFrame(fitView);
      return () => cancelAnimationFrame(id);
    }
  }, [fitView, tables.length]);

  /* ---------- wheel zoom/pan (native listener for preventDefault) ---------- */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        setView((v) => {
          const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
          const zoom = clamp(v.zoom * factor, 0.3, 2);
          return {
            zoom,
            x: mx - ((mx - v.x) / v.zoom) * zoom,
            y: my - ((my - v.y) / v.zoom) * zoom,
          };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPending(null);
        setSelectedRelId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hasSchema) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <EmptyState
          icon={GitBranch}
          title={t("builder.noDatabaseTitle")}
          description={t("builder.noDatabaseHint")}
          action={<Button onClick={() => navigate("home")}>{t("nav.home")}</Button>}
          className="w-full border border-border bg-card"
        />
      </div>
    );
  }

  const startPan = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("[data-node]")) return;
    setSelectedRelId(null);
    if (pending) setPending(null);
    canvasRef.current?.setPointerCapture?.(e.pointerId);
    setPan({ startX: e.clientX, startY: e.clientY, orig: view });
  };

  const onPointerMove = (e) => {
    if (pan) {
      setView({ ...pan.orig, x: pan.orig.x + (e.clientX - pan.startX), y: pan.orig.y + (e.clientY - pan.startY) });
    } else if (drag) {
      setDrag({ ...drag, dx: (e.clientX - drag.startClientX) / view.zoom, dy: (e.clientY - drag.startClientY) / view.zoom });
    } else if (pending) {
      setPending({ ...pending, to: toWorld(e.clientX, e.clientY) });
    }
  };

  const onPointerUp = () => {
    if (drag) {
      setTablePos(drag.tableId, Math.round(drag.origX + drag.dx), Math.round(drag.origY + drag.dy));
      setDrag(null);
    }
    if (pan) setPan(null);
  };

  const startDrag = (table, e) => {
    e.stopPropagation();
    setSelectedRelId(null);
    canvasRef.current?.setPointerCapture?.(e.pointerId);
    setDrag({ tableId: table.id, origX: table.x, origY: table.y, startClientX: e.clientX, startClientY: e.clientY, dx: 0, dy: 0 });
  };

  const onColumnClick = (table, col, side) => {
    if (!pending) {
      const anchor = columnAnchor(table, col.id, side === "right" ? "right" : "left");
      setPending({ tableId: table.id, columnId: col.id, side, from: anchor, to: null });
      setSelectedRelId(null);
      return;
    }
    // completing a connection
    if (pending.tableId === table.id && pending.columnId === col.id) {
      setPending(null);
      return;
    }
    setRelationDraft({
      sourceTable: pending.tableId,
      sourceColumn: pending.columnId,
      targetTable: table.id,
      targetColumn: col.id,
      type: "1-n",
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
    });
    setPending(null);
  };

  const selectedRelation = relations.find((r) => r.id === selectedRelId);
  const selectedMid = (() => {
    if (!selectedRelation) return null;
    const st = tables.find((t) => t.id === selectedRelation.sourceTable);
    const tt = tables.find((t) => t.id === selectedRelation.targetTable);
    if (!st || !tt) return null;
    return buildPath(columnAnchor(st, selectedRelation.sourceColumn, "right"), columnAnchor(tt, selectedRelation.targetColumn, "left")).mid;
  })();

  return (
    <div className="relative h-[calc(100dvh-3.5rem)]" dir="ltr">
      <div
        ref={canvasRef}
        className="canvas-grid absolute inset-0 touch-none overflow-hidden cursor-grab active:cursor-grabbing"
        onPointerDown={startPan}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, width: 4000, height: 3000 }}
        >
          <RelationsLayer schema={schema} selectedId={selectedRelId} onSelect={(id) => setSelectedRelId(id)} pending={pending} />

          {tables.map((tb) => {
            const d = drag?.tableId === tb.id ? drag : null;
            const table = d ? { ...tb, x: tb.x + d.dx, y: tb.y + d.dy } : tb;
            return (
              <div key={tb.id} data-node onPointerDown={(e) => e.stopPropagation()}>
                <TableNode
                  table={table}
                  selected={false}
                  dragging={!!d}
                  pendingSource={pending ? { tableId: pending.tableId, columnId: pending.columnId } : null}
                  onHeaderPointerDown={(e) => startDrag(tb, e)}
                  onColumnClick={onColumnClick}
                  onSelect={() => { setSelectedTableId(tb.id); navigate("builder"); }}
                />
              </div>
            );
          })}

          {selectedRelation && selectedMid && (
            <div
              className="absolute z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-lg"
              style={{ left: selectedMid.x, top: selectedMid.y - 20, transform: "translate(-50%, -100%)" }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="iconSm" onClick={() => setRelationDraft(selectedRelation)} title={t("common.edit")}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="iconSm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDeleteRel(selectedRelation)} title={t("common.delete")}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <EmptyState
              icon={GitBranch}
              title={t("diagram.emptyTitle")}
              description={t("diagram.emptyHint")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => addTable()}>
                    <Plus className="h-4 w-4" />
                    {t("builder.addFirstTable")}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("templates")}>{t("welcome.startTemplate")}</Button>
                </div>
              }
              className="rounded-xl border border-border bg-card/90 backdrop-blur"
            />
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-card/90 px-2 py-1.5 shadow-lg backdrop-blur">
          <Button variant="ghost" size="sm" onClick={() => addTable()}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("builder.addTable")}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRelationDraft({ sourceTable: tables[0]?.id })} disabled={tables.length < 2}>
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">{t("builder.addRelation")}</span>
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="iconSm" onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom / 1.2, 0.3, 2) }))} aria-label={t("diagram.zoomOut")} title={t("diagram.zoomOut")}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Badge variant="muted" size="sm" className="tnum w-12 justify-center">{Math.round(view.zoom * 100)}%</Badge>
          <Button variant="ghost" size="iconSm" onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 1.2, 0.3, 2) }))} aria-label={t("diagram.zoomIn")} title={t("diagram.zoomIn")}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={fitView} title={t("diagram.fit")} aria-label={t("diagram.fit")}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 hidden justify-center px-4 sm:flex">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/85 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
          <MousePointerClick className="h-3.5 w-3.5" />
          {pending ? t("diagram.pendingHint") : t("diagram.hint")}
          {pending && (
            <button className="pointer-events-auto ms-1 text-primary underline" onClick={() => setPending(null)}>
              {t("common.cancel")}
            </button>
          )}
        </div>
      </div>

      <RelationEditor
        open={!!relationDraft}
        initial={relationDraft}
        tables={schema.tables}
        engine={engine}
        onClose={() => setRelationDraft(null)}
        onSubmit={(rel) => {
          if (rel.id && relations.some((r) => r.id === rel.id)) updateRelation(rel.id, rel);
          else addRelation(rel);
          setSelectedRelId(null);
        }}
        onDelete={deleteRelation}
      />

      <ConfirmDialog
        open={!!confirmDeleteRel}
        onClose={() => setConfirmDeleteRel(null)}
        onConfirm={() => {
          deleteRelation(confirmDeleteRel.id);
          setSelectedRelId(null);
        }}
        title={t("confirm.deleteRelationTitle")}
        body={t("confirm.deleteRelationBody")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
      />
    </div>
  );
}
