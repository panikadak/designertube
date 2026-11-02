// Site-wide constants and URL helpers. Shared by server and client code.
import type { Video } from "./types";

/** Canonical origin. Forks: set NEXT_PUBLIC_SITE_URL to your own domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://designertube.app").replace(/\/$/, "");
export const SITE_NAME = "DesignerTube";
export const TAGLINE = "The YouTube videos that Hacker News keeps telling designers to watch.";

export function slugify(s: string, max = 80): string {
  const slug = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= max) return slug || "video";
  const cut = slug.slice(0, max);
  return cut.slice(0, cut.lastIndexOf("-") > 40 ? cut.lastIndexOf("-") : max).replace(/-+$/, "");
}

/** Permalink of a video page: /watch/{youtube id}/{title slug}. */
export const videoPath = (v: Pick<Video, "vid" | "title">) => `/watch/${v.vid}/${slugify(v.title)}`;
export const absolute = (path: string) => `${SITE_URL}${path}`;

export const ytThumb = (vid: string, kind: "hqdefault" | "mqdefault" | "hq2" | "maxresdefault" = "hqdefault") =>
  `https://i.ytimg.com/vi/${vid}/${kind}.jpg`;
export const ytEmbed = (vid: string) => `https://www.youtube.com/embed/${vid}`;
