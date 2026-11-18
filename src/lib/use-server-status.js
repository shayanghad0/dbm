import { useEffect, useState } from "react";

/** Detect whether the REST API server is reachable (with timeout). */
export function useServerStatus(pollMs = 0) {
  const [status, setStatus] = useState("checking"); // checking | online | offline

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/health", { signal: AbortSignal.timeout(3000) });
        if (alive) setStatus(res.ok ? "online" : "offline");
      } catch {
        if (alive) setStatus("offline");
      }
    };
    check();
    if (pollMs) {
      const t = setInterval(check, pollMs);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }
    return () => {
      alive = false;
    };
  }, [pollMs]);

  return status;
}
