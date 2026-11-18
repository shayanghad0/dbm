import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "../locales/en.json";
import fa from "../locales/fa.json";

const DICTS = { en, fa };

const I18nContext = createContext(null);

function detectLang() {
  try {
    const saved = localStorage.getItem("dbeb.lang");
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return nav.toLowerCase().startsWith("fa") ? "fa" : "en";
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (next) => {
    setLangState(next);
    try {
      localStorage.setItem("dbeb.lang", next);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(() => {
    const dict = DICTS[lang];
    const t = (key, params) => {
      let s = key.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), dict);
      if (s == null) s = key.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), DICTS.en);
      if (typeof s !== "string") return key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    };
    return { lang, setLang, t, dir: lang === "fa" ? "rtl" : "ltr", isRtl: lang === "fa" };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
