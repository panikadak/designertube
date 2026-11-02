"use client";

// One YouTube iframe for the whole app. On a video's page it sits exactly over the page's player
// slot; anywhere else it docks bottom-right as a mini player, like YouTube. The iframe is never
// moved in the DOM (that would reload the video), only repositioned.
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { videoPath } from "@/lib/site";

export type NowPlaying = { vid: string; title: string; channel: string };

type PlayerApi = {
  now: NowPlaying | null;
  playing: boolean;
  play: (v: NowPlaying) => void;
  toggle: () => void;
  close: () => void;
  /** A watch page registers its player area while it is on screen. */
  slot: (vid: string, el: HTMLElement | null) => void;
};

const PlayerCtx = createContext<PlayerApi | null>(null);

export function usePlayer() {
  const p = useContext(PlayerCtx);
  if (!p) throw new Error("usePlayer outside PlayerProvider");
  return p;
}

const YT = "https://www.youtube-nocookie.com";
type Box = { top: number; left: number; width: number; height: number };

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [playing, setPlaying] = useState(false);
  const [slotEl, setSlotEl] = useState<{ vid: string; el: HTMLElement } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const heard = useRef(false);

  // The embed's postMessage protocol (the same one YouTube's IFrame API uses), so no extra script.
  const post = useCallback((msg: object) => frame.current?.contentWindow?.postMessage(JSON.stringify(msg), YT), []);
  const command = useCallback((func: string) => post({ event: "command", func, args: [], id: 1, channel: "widget" }), [post]);

  const play = useCallback(
    (v: NowPlaying) => {
      if (now?.vid === v.vid) command("playVideo");
      else setNow(v);
      setPlaying(true);
    },
    [now, command],
  );
  const toggle = useCallback(() => {
    command(playing ? "pauseVideo" : "playVideo");
    setPlaying(!playing);
  }, [playing, command]);
  const close = useCallback(() => {
    setNow(null);
    setPlaying(false);
  }, []);
  const slot = useCallback((vid: string, el: HTMLElement | null) => {
    setSlotEl((cur) => (el ? { vid, el } : cur?.vid === vid ? null : cur));
  }, []);

  const inline = Boolean(now && slotEl && slotEl.vid === now.vid);

  // Keep the inline player glued to its slot (document coordinates, so it scrolls with the page).
  useLayoutEffect(() => {
    if (!inline || !slotEl) return;
    const el = slotEl.el;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [inline, slotEl]);

  // Player state reported by the embed keeps the play/pause button honest.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== YT || typeof e.data !== "string") return;
      let d: { event?: string; info?: unknown };
      try {
        d = JSON.parse(e.data);
      } catch {
        return;
      }
      heard.current = true;
      const state =
        d.event === "onStateChange" && typeof d.info === "number"
          ? d.info
          : d.event === "infoDelivery" && typeof (d.info as { playerState?: number })?.playerState === "number"
            ? (d.info as { playerState: number }).playerState
            : null;
      if (state === 1 || state === 3) setPlaying(true); // playing, buffering
      else if (state === 0 || state === 2) setPlaying(false); // ended, paused
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Ask the embed to start reporting; repeat until it answers (it ignores messages before it is ready).
  const listen = useCallback(() => {
    heard.current = false;
    let tries = 0;
    const ping = () => {
      if (heard.current || tries++ > 20) return;
      post({ event: "listening", id: 1, channel: "widget" });
      window.setTimeout(ping, 250);
    };
    ping();
  }, [post]);

  const api: PlayerApi = { now, playing, play, toggle, close, slot };

  return (
    <PlayerCtx.Provider value={api}>
      {children}
      {now && (
        <div
          className={`gp ${inline ? "gp-inline" : "gp-mini"}`}
          style={inline && box ? { top: box.top, left: box.left, width: box.width, height: box.height } : undefined}
          aria-label={inline ? undefined : "Mini player"}
          role={inline ? undefined : "region"}
        >
          <div className="gp-video">
            <iframe
              ref={frame}
              key={now.vid}
              src={`${YT}/embed/${now.vid}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`}
              title={now.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              onLoad={listen}
            />
          </div>
          <div className="gp-bar">
            <Link href={videoPath(now)} className="gp-text" title="Back to the video">
              <span className="gp-title">{now.title}</span>
              <span className="gp-channel">{now.channel}</span>
            </Link>
            <button className="icon-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"}>
              <Icon name={playing ? "pause" : "play"} />
            </button>
            <Link href={videoPath(now)} className="icon-btn" aria-label="Open the video page" title="Open the video page">
              <Icon name="expand" size={20} />
            </Link>
            <button className="icon-btn" onClick={close} aria-label="Close player" title="Close">
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}
    </PlayerCtx.Provider>
  );
}
