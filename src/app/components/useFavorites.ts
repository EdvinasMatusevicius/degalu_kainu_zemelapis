"use client";

import { useCallback, useSyncExternalStore } from "react";

// Favorites are stored locally in the browser, keyed by the stable stations.id.
// No account needed; the trade-off is they're per-device and not synced.
const STORAGE_KEY = "degalu:favorites:v1";
// Dispatched on every local write so the same tab re-renders — the native
// `storage` event only fires in *other* tabs.
const CHANGE_EVENT = "degalu:favorites-change";

const EMPTY: ReadonlySet<number> = new Set();

// getSnapshot must return a referentially stable value when nothing changed,
// or useSyncExternalStore loops forever. We cache the parsed Set against the
// raw string and only rebuild it when the stored value actually changes.
let cachedRaw: string | null = null;
let cachedSet: ReadonlySet<number> = EMPTY;

function readFavorites(): ReadonlySet<number> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedSet;
  cachedRaw = raw;
  try {
    cachedSet = raw ? new Set(JSON.parse(raw) as number[]) : EMPTY;
  } catch {
    cachedSet = EMPTY;
  }
  return cachedSet;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// localStorage doesn't exist during SSR — start empty and let the client
// snapshot fill in after hydration. This keeps server/first render in sync.
function getServerSnapshot(): ReadonlySet<number> {
  return EMPTY;
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, readFavorites, getServerSnapshot);

  const toggleFavorite = useCallback((id: number) => {
    const next = new Set(readFavorites());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // ignore write failures (private mode quota, etc.)
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { favorites, toggleFavorite };
}
