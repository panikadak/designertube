"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayer } from "./PlayerProvider";
import { Icon } from "./Icon";
import { useToast } from "./Shell";
import { avatarColor, hnUrl, poster, STANCE_LABEL, ytUrl } from "@/lib/format";
import { pushHistory, toggle, useList } from "@/lib/store";
import type { Mention } from "@/lib/types";

/** The page's player area. The video itself plays in the app-wide player, which sits over this slot. */
export function Player({ vid, title, channel }: { vid: string; title: string; channel: string }) {
  const { now, play, slot } = usePlayer();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => pushHistory(vid), [vid]);
  useEffect(() => {
    slot(vid, ref.current);
    return () => slot(vid, null);
  }, [vid, slot]);
  return (
    <div className="player" ref={ref}>
      {now?.vid !== vid && (
        <button className="poster-btn" onClick={() => play({ vid, title, channel })} aria-label={`Play ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster(vid)} alt="" />
          <span className="play">
            <Icon name="play" size={32} />
          </span>
        </button>
      )}
    </div>
  );
}

export function Actions({ vid }: { vid: string }) {
  const liked = useList("liked").includes(vid);
  const disliked = useList("disliked").includes(vid);
  const later = useList("later").includes(vid);
  const toast = useToast();

  useEffect(() => {
    const onKey = (e: Event) => {
      const k = (e as CustomEvent<string>).detail;
      if (k === "l") toast(toggle("liked", vid) ? "Added to Liked videos" : "Removed from Liked videos");
      if (k === "w") toast(toggle("later", vid) ? "Saved to Watch later" : "Removed from Watch later");
    };
    window.addEventListener("dt:key", onKey);
    return () => window.removeEventListener("dt:key", onKey);
  }, [vid, toast]);

  return (
    <div className="actions">
      <div className="pill-group">
        <button
          className={`pill${liked ? " on" : ""}`}
          onClick={() => toast(toggle("liked", vid) ? "Added to Liked videos" : "Removed from Liked videos")}
          aria-pressed={liked}
        >
          <Icon name={liked ? "like" : "likeOutline"} size={20} /> Like
        </button>
        <button
          className={`pill${disliked ? " on" : ""}`}
          onClick={() => toast(toggle("disliked", vid) ? "You'll see less like this" : "Removed dislike")}
          aria-pressed={disliked}
          aria-label="Dislike"
        >
          <Icon name={disliked ? "dislike" : "dislikeOutline"} size={20} />
        </button>
      </div>
      <button
        className={`pill${later ? " on" : ""}`}
        onClick={() => toast(toggle("later", vid) ? "Saved to Watch later" : "Removed from Watch later")}
      >
        <Icon name={later ? "check" : "later"} size={20} /> Watch later
      </button>
      <a className="pill" href={ytUrl(vid)} target="_blank" rel="noopener noreferrer">
        <Icon name="external" size={20} /> YouTube
      </a>
    </div>
  );
}

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;

function CommentText({ text, vids }: { text: string; vids: string[] }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          vids.some((v) => p.includes(v)) ? (
            <span key={i} className="tag-link">▶ this video</span>
          ) : (
            <a key={i} className="tag-link" href={p} target="_blank" rel="noopener noreferrer nofollow">
              link
            </a>
          )
        ) : (
          p
        ),
      )}
    </>
  );
}

function Comment({ m, vids }: { m: Mention; vids: string[] }) {
  const [open, setOpen] = useState(false);
  const long = m.text.length > 420;
  return (
    <div className="comment">
      <div className="avatar" style={{ background: avatarColor(m.author) }}>{m.author.slice(0, 1)}</div>
      <div>
        <div className="comment-head">
          <b>@{m.author}</b>
          {m.month.slice(0, 4)}
          {m.story_title && <> · in “{m.story_title}”</>}
        </div>
        {m.kind === "story" && !m.text ? (
          <div className="comment-text muted">Submitted the video to Hacker News.</div>
        ) : (
          <div className={`comment-text${long && !open ? " clamped" : ""}`}>
            <CommentText text={m.text} vids={vids} />
          </div>
        )}
        <div className="comment-foot">
          <span className={`stance ${m.stance}`}>{STANCE_LABEL[m.stance] ?? m.stance}</span>
          {long && (
            <button className="link-btn" onClick={() => setOpen((o) => !o)}>
              {open ? "Show less" : "Read more"}
            </button>
          )}
          <a className="link-btn" href={hnUrl(m.id)} target="_blank" rel="noopener noreferrer">
            View on HN
          </a>
        </div>
      </div>
    </div>
  );
}

export function Comments({ mentions, vids }: { mentions: Mention[]; vids: string[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? mentions : mentions.slice(0, 12);
  return (
    <section className="comments">
      <h2>
        {mentions.length} comment{mentions.length === 1 ? "" : "s"} from Hacker News
      </h2>
      {shown.map((m) => (
        <Comment key={m.id} m={m} vids={vids} />
      ))}
      {!all && mentions.length > shown.length && (
        <button className="pill" onClick={() => setAll(true)}>
          Show {mentions.length - shown.length} more
        </button>
      )}
    </section>
  );
}
