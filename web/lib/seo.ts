// schema.org JSON-LD builders. Rendered with <JsonLd> on each page.
import { SITE_NAME, SITE_URL, TAGLINE, absolute, videoPath, ytEmbed, ytThumb } from "./site";
import type { Mention, Video } from "./types";

type Crumb = { name: string; path: string };

/** ISO 8601 duration, e.g. 3725 -> PT1H2M5S. */
export function isoDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${sec || (!h && !m) ? `${sec}S` : ""}`;
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
