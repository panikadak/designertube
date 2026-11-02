"use client";

import { useEffect, useState } from "react";
import { useGridKeys } from "./Feed";
import { VideoCard } from "./VideoCard";
import { setList, useList, type ListKey } from "@/lib/store";
import type { Video } from "@/lib/types";

const COPY: Record<Exclude<ListKey, "disliked">, { title: string; empty: string; clear: string }> = {
  liked: { title: "Liked videos", empty: "Videos you like show up here, and steer your Home feed.", clear: "Clear likes" },
  history: { title: "History", empty: "Videos you open show up here. History stays in this browser.", clear: "Clear history" },
  later: { title: "Watch later", empty: "Save videos for later from any thumbnail or video page.", clear: "Clear list" },
};

export function MyList({ kind }: { kind: Exclude<ListKey, "disliked"> }) {
  const ids = useList(kind);
  const key = ids.join(",");
  const [loaded, setLoaded] = useState<{ key: string; items: Video[] } | null>(null);
  const items = !key ? [] : loaded?.key === key ? loaded.items : null;
  const sel = useGridKeys(items ?? []);

  useEffect(() => {
    if (!key) return;
    let live = true;
    fetch(`/api/videos?ids=${key}`)
      .then((r) => r.json())
      .then((d: Video[]) => live && setLoaded({ key, items: d }));
    return () => {
      live = false;
    };
  }, [key]);

  const c = COPY[kind];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <h1 className="page-title">{c.title}</h1>
        {ids.length > 0 && (
          <button className="pill" onClick={() => confirm(`${c.clear}?`) && setList(kind, [])}>
            {c.clear}
          </button>
        )}
      </div>
      {items === null ? (
        <div className="spinner" />
      ) : items.length === 0 ? (
        <div className="empty">{c.empty}</div>
      ) : (
        <div className="grid">
          {items.map((v, i) => (
            <VideoCard key={v.vid} v={v} selected={i === sel} />
          ))}
        </div>
      )}
    </>
  );
}
