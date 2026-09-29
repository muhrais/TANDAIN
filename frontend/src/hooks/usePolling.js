import { useCallback, useEffect, useRef, useState } from "react";
import { POLL_INTERVAL_MS } from "../lib/config";

const MAX_BACKOFF_MS = 30000;

// Polling generik: fetch sekali saat mount, lalu ulang tiap `intervalMs`.
// - Skip siklus kalau request sebelumnya belum selesai (inFlightRef).
// - Pause total saat tab disembunyikan; langsung fetch lagi saat tab aktif.
// - Saat error: data lama TIDAK dikosongkan, cuma `error` di-set, dan
//   interval berikutnya mundur (backoff 2x tiap gagal, maks 30 dtk).
export function usePolling(fetcher, intervalMs = POLL_INTERVAL_MS) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const inFlightRef = useRef(false);
  const timerRef = useRef(null);
  const delayRef = useRef(intervalMs);

  const fetchNow = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      delayRef.current = intervalMs;
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
      delayRef.current = Math.min(delayRef.current * 2, MAX_BACKOFF_MS);
    } finally {
      inFlightRef.current = false;
    }
  }, [intervalMs]);

  const scheduleNext = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      // Tab tersembunyi: berhenti total, biar tidak buang baterai/kuota.
      // Listener visibilitychange di bawah yang menyalakan lagi siklusnya.
      if (document.visibilityState === "hidden") return;
      await fetchNow();
      scheduleNext();
    }, delayRef.current);
  }, [fetchNow]);

  useEffect(() => {
    let cancelled = false;

    fetchNow().then(() => {
      if (!cancelled) scheduleNext();
    });

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        clearTimeout(timerRef.current);
        fetchNow().then(() => {
          if (!cancelled) scheduleNext();
        });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // Sengaja hanya jalan sekali saat mount — fetchNow/scheduleNext dibungkus
    // ref & useCallback supaya identitasnya stabil lintas render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => {
    clearTimeout(timerRef.current);
    return fetchNow().then(() => scheduleNext());
  }, [fetchNow, scheduleNext]);

  return { data, error, lastUpdated, refresh };
}
