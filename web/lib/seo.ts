// schema.org JSON-LD builders. Rendered with <JsonLd> on each page.
import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, TAGLINE, absolute, videoPath, ytEmbed, ytThumb } from "./site";
import type { Mention, Video } from "./types";

type Crumb = { name: string; path: string };

/** Meta description that fits a search snippet: whole sentences up to ~max chars, else words + "…". */
export function clip(text: string, max = 160) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
  let out = "";
  for (const s of sentences) {
    if ((out + s).trim().length > max) break;
    out += s;
  }
  if (out.trim().length >= max * 0.6) return out.trim();
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.-]+$/, "")}…`;
}

/** ISO 8601 duration, e.g. 3725 -> PT1H2M5S. */
export function isoDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${sec || (!h && !m) ? `${sec}S` : ""}`;
}

/**
 * Per-page canonical, Open Graph and Twitter tags. Next.js replaces these objects wholesale rather
 * than merging them with the layout's, so every indexable page sets all of them here.
 */
export function pageMeta({
  path,
  title,
  description,
  type = "website",
  extra = {},
}: {
  path: string;
  title: string;
  description: string;
  type?: "website" | "video.other";
  extra?: Record<string, unknown>;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { siteName: SITE_NAME, locale: "en_US", type, url: path, title, description, ...extra },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: TAGLINE,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: absolute("/icon.svg") },
      },
    ],
  };
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absolute(c.path),
    })),
  };
}

export function videoCrumbs(v: Video): Crumb[] {
  const c = v.categories[0];
  return [
    { name: "Home", path: "/" },
    ...(c ? [{ name: c.area_name, path: `/c/${c.area}` }, { name: c.name, path: `/c/${c.id}` }] : []),
    { name: v.title, path: videoPath(v) },
  ];
}

export function videoJsonLd(v: Video, mentions: Mention[]) {
  const url = absolute(videoPath(v));
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${url}#video`,
    name: v.title,
    description: `${v.summary} ${v.why_hn}`.trim(),
    url,
    thumbnailUrl: [ytThumb(v.vid, "hqdefault"), ytThumb(v.vid, "mqdefault"), ytThumb(v.vid, "hq2")],
    embedUrl: ytEmbed(v.vid),
    ...(v.published ? { uploadDate: v.published } : {}),
    ...(v.duration_s ? { duration: isoDuration(v.duration_s) } : {}),
    ...(v.views
      ? {
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: { "@type": "WatchAction" },
            userInteractionCount: v.views,
          },
        }
      : {}),
    author: { "@type": "Organization", name: v.channel },
    genre: v.categories.map((c) => c.name),
    keywords: v.tags.join(", "),
    inLanguage: "en",
    isFamilyFriendly: true,
    publisher: { "@id": `${SITE_URL}/#organization` },
    commentCount: mentions.length,
    comment: mentions.slice(0, 10).map((m) => ({
      "@type": "Comment",
      url: `https://news.ycombinator.com/item?id=${m.id}`,
      dateCreated: m.month,
      text: m.text.slice(0, 500),
      author: { "@type": "Person", name: m.author, url: `https://news.ycombinator.com/user?id=${m.author}` },
    })),
  };
}

export function itemListJsonLd(name: string, path: string, vids: Video[], ordered = false) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: absolute(path),
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: ordered ? "https://schema.org/ItemListOrderAscending" : "https://schema.org/ItemListUnordered",
      numberOfItems: vids.length,
      itemListElement: vids.slice(0, 100).map((v, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absolute(videoPath(v)),
        name: v.title,
      })),
    },
  };
}
