"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { VideoCard } from "./VideoCard";
import { videoPath } from "@/lib/site";
import { getList, toggle } from "@/lib/store";
import type { FeedItem } from "@/lib/types";

export type FilterOptions = {
  areas: { id: string; name: string }[];
  types: string[];
};

const LEVELS = ["general", "intermediate", "expert"];
const SHELF = ["evergreen", "dated", "historical"];
const PAGE = 36;

type Filters = { type?: string; level?: string; area?: string; shelf?: string };

function newSeed() {
  return Math.floor(Math.random() * 1e9) + 1;
}

/** j/k selection over the rendered cards, shared by every grid page. */
export function useGridKeys(items: { vid: string; title: string }[]) {
  const router = useRouter();
  const [sel, setSel] = useState(-1);
  useEffect(() => {
    const onKey = (e: Event) => {
      const key = (e as CustomEvent<string>).detail;
      if (key === "j" || key === "k") {
        setSel((s) => {
          const n = Math.max(0, Math.min(items.length - 1, s + (key === "j" ? 1 : -1)));
          document.querySelector(`[data-vid="${items[n]?.vid}"]`)?.scrollIntoView({ block: "nearest" });
          return n;
        });
      } else if (key === "Enter" && items[sel]) {
        router.push(videoPath(items[sel]));
      } else if ((key === "l" || key === "w") && items[sel]) {
        toggle(key === "l" ? "liked" : "later", items[sel].vid);
      }
    };
    window.addEventListener("dt:key", onKey);
    return () => window.removeEventListener("dt:key", onKey);
  }, [items, sel, router]);
  return sel;
}

export function Feed({ options, initial, initialSeed }: { options: FilterOptions; initial: FeedItem[]; initialSeed: number }) {
  const [items, setItems] = useState<FeedItem[]>(initial);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);
  const seed = useRef(initialSeed);
  const offset = useRef(initial.length);
  const mounted = useRef(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const sel = useGridKeys(items);

  const load = useCallback(
    async (reset: boolean) => {
      if (busy.current) return;
      busy.current = true;
      setLoading(true);
      if (reset) {
        seed.current ||= newSeed();
        offset.current = 0;
      }
      const params = new URLSearchParams({
        like: getList("liked").slice(0, 60).join(","),
        dislike: getList("disliked").slice(0, 200).join(","),
        seen: getList("history").slice(0, 300).join(","),
        seed: String(seed.current),
        offset: String(offset.current),
        n: String(PAGE),
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });
      try {
        const res = await fetch(`/api/feed?${params}`);
        const page: FeedItem[] = await res.json();
        offset.current += page.length;
        setItems((cur) => (reset ? page : [...cur, ...page.filter((p) => !cur.some((c) => c.vid === p.vid))]));
        setDone(page.length < PAGE);
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // keep the server-rendered page unless this browser has history that should shape the feed
      if (!getList("liked").length && !getList("disliked").length && !getList("history").length) return;
      seed.current = newSeed();
    }
    load(true);
  }, [load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && !done && load(false), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load, done]);

  const set = (k: keyof Filters, v: string) => setFilters((f) => ({ ...f, [k]: f[k] === v ? undefined : v }));
  const active = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <div className="chips chips-row">
        <button className={`chip${showFilters || active ? " active" : ""}`} onClick={() => setShowFilters((s) => !s)}>
          <Icon name="tune" size={18} /> Filters{active ? ` · ${active}` : ""}
        </button>
        {options.areas.map((a) => (
          <button key={a.id} className={`chip${filters.area === a.id ? " active" : ""}`} onClick={() => set("area", a.id)}>
            {a.name}
          </button>
        ))}
      </div>
      {showFilters && (
        <div className="filters-panel">
          <div>
            <h4>Type</h4>
            <div className="chips">
              {options.types.map((t) => (
                <button key={t} className={`chip${filters.type === t ? " active" : ""}`} onClick={() => set("type", t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4>Level</h4>
            <div className="chips">
              {LEVELS.map((t) => (
                <button key={t} className={`chip${filters.level === t ? " active" : ""}`} onClick={() => set("level", t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4>Shelf life</h4>
            <div className="chips">
              {SHELF.map((t) => (
                <button key={t} className={`chip${filters.shelf === t ? " active" : ""}`} onClick={() => set("shelf", t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4>Area</h4>
            <div className="chips">
              {options.areas.map((a) => (
                <button key={a.id} className={`chip${filters.area === a.id ? " active" : ""}`} onClick={() => set("area", a.id)}>
                  {a.name}
                </button>
              ))}
            </div>
          </div>
          {active > 0 && (
            <div>
              <button className="link-btn" onClick={() => setFilters({})}>Clear filters</button>
            </div>
          )}
        </div>
      )}
      <div className="grid">
        {items.map((v, i) => (
          <VideoCard
            key={v.vid}
            v={v}
            priority={i < 4}
            selected={i === sel}
            onDismiss={(vid) => setItems((cur) => cur.filter((x) => x.vid !== vid))}
          />
        ))}
      </div>
      {!loading && !items.length && <div className="empty">Nothing matches these filters.</div>}
      {loading && <div className="spinner" />}
      <div ref={sentinel} />
    </>
  );
}
