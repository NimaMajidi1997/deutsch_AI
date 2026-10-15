"use client";
// Per-browser preferences and bookmarks (localStorage), shared across components.
import { useCallback, useSyncExternalStore } from "react";

type State = { saved: string[]; english: boolean; autoplay: boolean };
const KEY = "deutschai:v1";
const DEFAULT: State = { saved: [], english: true, autoplay: true };

let state: State = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

function useStore<T>(select: (s: State) => T, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => (load(), select(state)),
    () => fallback,
  );
}

export function useSaved() {
  const saved = useStore((s) => s.saved, DEFAULT.saved);
  const toggle = useCallback((id: string) => {
    set({ saved: state.saved.includes(id) ? state.saved.filter((x) => x !== id) : [...state.saved, id] });
  }, []);
  return { saved, toggle };
}

export function useEnglish() {
  const english = useStore((s) => s.english, DEFAULT.english);
  return { english, setEnglish: (v: boolean) => set({ english: v }) };
}

export function useAutoplay() {
  const autoplay = useStore((s) => s.autoplay, DEFAULT.autoplay);
  return { autoplay, setAutoplay: (v: boolean) => set({ autoplay: v }) };
}
