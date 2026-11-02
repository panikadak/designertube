"use client";

// All personal state lives in this browser only. No accounts.
import { useCallback, useSyncExternalStore } from "react";

export type ListKey = "liked" | "disliked" | "later" | "history";
type Listener = () => void;

const listeners = new Set<Listener>();
const cache = new Map<string, unknown>();
const EMPTY: string[] = [];

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let v = fallback;
  try {
    const raw = localStorage.getItem("dt:" + key);
    if (raw != null) v = JSON.parse(raw) as T;
  } catch {}
  cache.set(key, v);
  return v;
}

function write<T>(key: string, v: T) {
  cache.set(key, v);
  try {
    localStorage.setItem("dt:" + key, JSON.stringify(v));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("dt:")) {
      cache.delete(e.key.slice(3));
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function getList(key: ListKey): string[] {
  return read<string[]>(key, EMPTY);
}

export function useList(key: ListKey): string[] {
  return useSyncExternalStore(
    subscribe,
    () => getList(key),
    () => EMPTY,
  );
}

export function setList(key: ListKey, vids: string[]) {
  write(key, vids);
}

export function toggle(key: ListKey, vid: string): boolean {
  const cur = getList(key);
  const on = !cur.includes(vid);
  setList(key, on ? [vid, ...cur] : cur.filter((v) => v !== vid));
  // like and dislike are exclusive
  if (on && key === "liked") setList("disliked", getList("disliked").filter((v) => v !== vid));
  if (on && key === "disliked") setList("liked", getList("liked").filter((v) => v !== vid));
  return on;
}

export function pushHistory(vid: string) {
  const cur = getList("history").filter((v) => v !== vid);
  setList("history", [vid, ...cur].slice(0, 500));
}

export function useSetting<T>(key: string, fallback: T): [T, (v: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read<T>("set:" + key, fallback),
    () => fallback,
  );
  const set = useCallback((v: T) => write("set:" + key, v), [key]);
  return [value, set];
}

export function clearAll() {
  for (const k of ["liked", "disliked", "later", "history"]) write(k, EMPTY);
}
