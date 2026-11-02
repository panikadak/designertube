// RSS 2.0 feed of the videos Hacker News recommended most recently (prerendered at build).
import { videos } from "@/lib/data";
import { SITE_NAME, SITE_URL, TAGLINE, absolute, videoPath, ytThumb } from "@/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfc822 = (ym: string) => new Date(`${ym}-01T12:00:00Z`).toUTCString();

export function GET() {
  const items = videos()
    .filter((v) => v.hn.last_rec)
    .sort((a, b) => b.hn.last_rec.localeCompare(a.hn.last_rec) || b.score - a.score)
    .slice(0, 50);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${esc(`${SITE_NAME}: recently recommended`)}</title>
<link>${SITE_URL}</link>
<atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
<description>${esc(TAGLINE)}</description>
<language>en</language>
<lastBuildDate>${rfc822(items[0]?.hn.last_rec ?? "2026-01")}</lastBuildDate>
${items
  .map((v) => {
    const url = absolute(videoPath(v));
    return `<item>
<title>${esc(v.title)}</title>
<link>${url}</link>
<guid isPermaLink="true">${url}</guid>
<pubDate>${rfc822(v.hn.last_rec)}</pubDate>
<description>${esc(`${v.summary} ${v.why_hn}`)}</description>
${v.categories.map((c) => `<category>${esc(c.name)}</category>`).join("")}
<media:thumbnail url="${ytThumb(v.vid, "hqdefault")}" width="480" height="360"/>
</item>`;
  })
  .join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
