import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";

/**
 * Custom dropdown select with optional grouped options and search.
 * options: [{ value, label, group?, hint? }]
 */
export function Select({ value, onChange, options, searchable = false, placeholder = "", className, buttonClassName, align = "start", disabled = false, ariaLabel }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const updatePosition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(320, openUp ? spaceAbove - 4 : spaceBelow - 4));
    const width = Math.max(rect.width, 160);
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin));
    setMenuStyle({
      position: "fixed",
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      left,
      width,
      maxHeight,
      zIndex: 200,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    // capture scroll from any scrollable ancestor
    document.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) setQuery("");
  }, [open, searchable]);

  const filtered = options.filter(
    (o) =>
      !query ||
      String(o.label).toLowerCase().includes(query.toLowerCase()) ||
      String(o.value).toLowerCase().includes(query.toLowerCase())
  );
  const groups = [];
  for (const o of filtered) {
    const g = o.group || "";
    let bucket = groups.find((x) => x.name === g);
    if (!bucket) {
      bucket = { name: g, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(o);
  }

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg animate-fade-in"
            role="listbox"
            aria-label={ariaLabel}
          >
            {searchable && (
              <div className="sticky top-0 z-10 bg-popover p-1">
                <div className="flex items-center gap-2 rounded-md border border-input bg-card px-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-7 w-full bg-transparent text-xs outline-none"
                    placeholder={t("common.search")}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            {filtered.length === 0 && <div className="px-2 py-3 text-center text-xs text-muted-foreground">{t("common.noResults")}</div>}
            {groups.map((g, gi) => (
              <div key={g.name + gi}>
                {g.name && <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.name}</div>}
                {g.items.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      btnRef.current?.focus();
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-start text-sm outline-none transition-colors",
                      o.value === value ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          buttonClassName
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {menu}
    </div>
  );
}
