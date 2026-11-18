import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware class merge */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Short unique id */
export function uid(prefix = "") {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

/** Trigger a browser download for text content */
export function downloadFile(content, filename, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Copy text to clipboard with legacy fallback */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/** kebab/pascal-ish slug for filenames */
export function slugify(name, fallback = "database") {
  const s = (name || "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-\u0600-\u06FF]/g, "")
    .replace(/-+/g, "-")
    .toLowerCase();
  return s || fallback;
}

export function formatDate(ts, locale = "en") {
  try {
    return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

/** Tiny escape for HTML preview panes */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
