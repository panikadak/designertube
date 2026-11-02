import type { Video } from "./types";

// YouTube's auto-generated frame from the middle of the video (hq1/hq2/hq3 = 25/50/75%).
export const thumb = (vid: string) => `https://i.ytimg.com/vi/${vid}/hq2.jpg`;
export const poster = (vid: string) => `https://i.ytimg.com/vi/${vid}/hq2.jpg`;
export const ytUrl = (vid: string) => `https://www.youtube.com/watch?v=${vid}`;
export const hnUrl = (id: number) => `https://news.ycombinator.com/item?id=${id}`;

export function duration(s?: number) {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function compact(n: number) {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

const DATA_DATE = Date.parse(process.env.NEXT_PUBLIC_DATA_DATE ?? "2026-11-02");

export function ago(iso: string) {
  const years = (DATA_DATE - new Date(iso).getTime()) / (365.25 * 864e5);
  if (years >= 1) return `${Math.floor(years)} year${years >= 2 ? "s" : ""} ago`;
  const months = Math.floor(years * 12);
  return months >= 1 ? `${months} month${months > 1 ? "s" : ""} ago` : "this month";
}

export const years = (v: Video) => (v.hn.first === v.hn.last ? v.hn.first : `${v.hn.first}–${v.hn.last}`);

/** Second line under a card title. Uses YouTube stats if present, HN stats otherwise. */
export function cardMeta(v: Video) {
  if (v.views && v.published) return `${compact(v.views)} views • ${ago(v.published)}`;
  const r = v.hn.recommenders;
  return `${r} HN recommender${r === 1 ? "" : "s"} • ${years(v)}`;
}

export const STANCE_LABEL: Record<string, string> = {
  strong: "Strongly recommends",
  rec: "Recommends",
  reference: "Cites",
  joke: "Jokes",
  critique: "Criticizes",
  other: "Mentions",
};

const AVATAR_COLORS = ["#c2185b", "#7b1fa2", "#512da8", "#1976d2", "#0097a7", "#388e3c", "#f57c00", "#5d4037", "#455a64", "#e64a19"];
export function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
