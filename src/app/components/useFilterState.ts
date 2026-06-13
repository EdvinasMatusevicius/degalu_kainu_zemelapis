"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { FuelKey, ViewMode } from "./StationsView";

// The last-used filter combination is stored locally so the page comes back the
// way the user left it. Like favorites, this is per-device and needs no account.
// localStorage is the single source of truth — the same useSyncExternalStore
// approach as useFavorites, which keeps server/first render in sync and avoids
// reading storage during render.
const STORAGE_KEY = "degalu:filters:v1";
// Dispatched on every local write so the same tab re-renders — the native
// `storage` event only fires in *other* tabs.
const CHANGE_EVENT = "degalu:filters-change";

// Shape persisted to localStorage. selectedBrands is an array because a Set
// isn't JSON-serializable.
type StoredFilters = {
  filter: string;
  fuel: FuelKey;
  view: ViewMode;
  selectedBrands: string[];
  favoritesOnly: boolean;
};

// Shape handed to the component: selectedBrands as a Set to match the existing
// filter UI, everything else passed through.
type FilterSnapshot = {
  filter: string;
  fuel: FuelKey;
  view: ViewMode;
  selectedBrands: Set<string>;
  favoritesOnly: boolean;
};

const FUEL_VALUES: readonly FuelKey[] = ["all", "dyzelis", "a95", "lpg"];
const VIEW_VALUES: readonly ViewMode[] = ["operator", "heatmap"];

const DEFAULTS: FilterSnapshot = {
  filter: "",
  fuel: "all",
  view: "operator",
  selectedBrands: new Set(),
  favoritesOnly: false,
};

// getSnapshot must return a referentially stable value when nothing changed, or
// useSyncExternalStore loops forever. We cache the parsed snapshot against the
// raw string and only rebuild it when the stored value actually changes.
let cachedRaw: string | null = null;
let cachedSnapshot: FilterSnapshot = DEFAULTS;

function parse(raw: string): FilterSnapshot {
  let data: Partial<StoredFilters>;
  try {
    data = JSON.parse(raw) as Partial<StoredFilters>;
  } catch {
    return DEFAULTS;
  }
  return {
    filter: typeof data.filter === "string" ? data.filter : DEFAULTS.filter,
    fuel: data.fuel && FUEL_VALUES.includes(data.fuel) ? data.fuel : DEFAULTS.fuel,
    view: data.view && VIEW_VALUES.includes(data.view) ? data.view : DEFAULTS.view,
    selectedBrands: Array.isArray(data.selectedBrands) ? new Set(data.selectedBrands) : new Set(),
    favoritesOnly: typeof data.favoritesOnly === "boolean" ? data.favoritesOnly : DEFAULTS.favoritesOnly,
  };
}

function readSnapshot(): FilterSnapshot {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULTS;
  }
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = raw ? parse(raw) : DEFAULTS;
  return cachedSnapshot;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// localStorage doesn't exist during SSR — start from defaults and let the client
// snapshot fill in after hydration. This keeps server/first render in sync.
function getServerSnapshot(): FilterSnapshot {
  return DEFAULTS;
}

function writeFilters(next: FilterSnapshot) {
  const stored: StoredFilters = {
    filter: next.filter,
    fuel: next.fuel,
    view: next.view,
    selectedBrands: [...next.selectedBrands],
    favoritesOnly: next.favoritesOnly,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // ignore write failures (private mode quota, etc.)
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useFilterState() {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);

  // Reads the freshest stored state before patching so independent setters
  // called back-to-back (e.g. fuel + view) don't clobber each other.
  const update = useCallback((patch: Partial<FilterSnapshot>) => {
    writeFilters({ ...readSnapshot(), ...patch });
  }, []);

  const setFilter = useCallback((value: string) => update({ filter: value }), [update]);
  const setFuel = useCallback((value: FuelKey) => update({ fuel: value }), [update]);
  const setView = useCallback((value: ViewMode) => update({ view: value }), [update]);
  const setSelectedBrands = useCallback((next: Set<string>) => update({ selectedBrands: next }), [update]);
  const setFavoritesOnly = useCallback((value: boolean) => update({ favoritesOnly: value }), [update]);

  return {
    filter: snapshot.filter, setFilter,
    fuel: snapshot.fuel, setFuel,
    view: snapshot.view, setView,
    selectedBrands: snapshot.selectedBrands, setSelectedBrands,
    favoritesOnly: snapshot.favoritesOnly, setFavoritesOnly,
  };
}
