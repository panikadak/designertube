import type { MetadataRoute } from "next";
import { playlists, taxonomy, videos } from "@/lib/data";
import { SITE_URL, absolute, videoPath, ytEmbed, ytThumb } from "@/lib/site";

// Next.js writes sitemap values into XML verbatim, so escape them here.
const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const month = (ym: string) => (ym ? `${ym}-01` : undefined);

export default function sitemap(): MetadataRoute.Sitemap {
  const all = videos();
  const newest = all.map((v) => v.hn.last_rec).sort().at(-1) ?? "";
  const lastModified = month(newest);

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified, changeFrequency: "daily", priority: 1 },
    ...["/categories", "/playlists", "/longs", "/c/all", "/c/recent", "/c/gems", "/about"].map((p) => ({
      url: absolute(p),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  const topics: MetadataRoute.Sitemap = taxonomy().flatMap((a) =>
    a.count
      ? [
          { url: absolute(`/c/${a.id}`), lastModified, changeFrequency: "weekly" as const, priority: 0.7 },
          ...a.topics
            .filter((t) => t.count)
            .map((t) => ({ url: absolute(`/c/${t.id}`), lastModified, changeFrequency: "weekly" as const, priority: 0.6 })),
        ]
      : [],
  );

  const lists: MetadataRoute.Sitemap = playlists().map((p) => ({
    url: absolute(`/p/${p.id}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const watch: MetadataRoute.Sitemap = all.map((v) => ({
    url: absolute(videoPath(v)),
    lastModified: month(v.hn.last_rec) ?? lastModified,
    changeFrequency: "monthly",
    priority: Math.min(0.9, 0.4 + v.score / 40),
    images: [xml(ytThumb(v.vid, "hqdefault"))],
    videos: [
      {
        title: xml(v.title),
        description: xml(`${v.summary} ${v.why_hn}`.slice(0, 2000)),
        thumbnail_loc: xml(ytThumb(v.vid, "hqdefault")),
        player_loc: xml(ytEmbed(v.vid)),
        ...(v.duration_s ? { duration: v.duration_s } : {}),
        ...(v.views ? { view_count: v.views } : {}),
        ...(v.published ? { publication_date: v.published } : {}),
        family_friendly: "yes" as const,
        tag: xml(v.primary_topic || v.tags[0] || "design"),
      },
    ],
  }));

  return [...pages, ...topics, ...lists, ...watch];
}
