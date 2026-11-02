"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./Icon";
import { useToast } from "./Shell";
import { cardMeta, duration, thumb } from "@/lib/format";
import { videoPath } from "@/lib/site";
import { toggle, useList } from "@/lib/store";
import type { FeedItem, Video } from "@/lib/types";

type Props = {
  v: Video | FeedItem;
  layout?: "grid" | "row" | "mini";
  selected?: boolean;
  onDismiss?: (vid: string) => void;
  priority?: boolean; // above the fold: load eagerly
};

export function Thumb({ v, reason, priority }: { v: Video; reason?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="thumb">
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb(v.vid)}
          alt={v.title}
          width={480}
          height={360}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailed(true)}
        />
      )}
      {v.duration_s ? <span className="badge">{duration(v.duration_s)}</span> : null}
      {reason && <span className="reason">{reason}</span>}
    </div>
  );
}

export function VideoCard({ v, layout = "grid", selected, onDismiss, priority }: Props) {
  const later = useList("later");
  const toast = useToast();
  const reason = "reason" in v ? v.reason : undefined;
  const saved = later.includes(v.vid);

  const onLater = (e: React.MouseEvent) => {
    e.preventDefault();
    toast(toggle("later", v.vid) ? "Saved to Watch later" : "Removed from Watch later");
  };
  const onNo = (e: React.MouseEvent) => {
    e.preventDefault();
    toggle("disliked", v.vid);
    onDismiss?.(v.vid);
    toast("Got it, you'll see less like this");
  };

  const cls = layout === "row" ? "card row" : layout === "mini" ? "card mini" : "card";
  return (
    <Link href={videoPath(v)} className={`${cls}${selected ? " selected" : ""}`} data-vid={v.vid}>
      <div style={{ position: "relative" }}>
        <Thumb v={v} reason={layout === "grid" ? reason : undefined} priority={priority} />
        {layout !== "mini" && (
          <div className="thumb-actions">
            <button onClick={onLater} aria-label={saved ? "Remove from Watch later" : "Watch later"} title="Watch later">
              <Icon name={saved ? "check" : "later"} size={20} />
            </button>
            {onDismiss && (
              <button onClick={onNo} aria-label="Not interested" title="Not interested">
                <Icon name="close" size={20} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="card-body">
        <h3 className="card-title" title={v.title}>{v.title}</h3>
        <div className="meta">{v.channel}</div>
        <div className="meta">{cardMeta(v)}</div>
        {layout === "row" && <div className="snippet">{v.summary}</div>}
      </div>
    </Link>
  );
}
