import { useCallback, useEffect, useState } from "react";

/** Minimal hash router: "#/builder" -> "builder" */
export function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return h || "home";
}

export function useHashRoute() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((next) => {
    const target = `#/${next === "home" ? "" : next}`;
    if (window.location.hash === target) setRoute(parseHash());
    else window.location.hash = target;
    window.scrollTo({ top: 0 });
  }, []);

  return [route, navigate];
}
