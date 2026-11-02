// Answers permalink requests with real HTTP statuses before anything renders:
// 308 to the canonical /watch/{id}/{slug}, 404 for ids that are not in the dataset.
import { NextResponse, type NextRequest } from "next/server";
import routes from "./data/routes.json";
import { slugify } from "./lib/site";

const videos = routes.videos as Record<string, string>;
const aliases = routes.aliases as Record<string, string>;
const topics = new Set([...routes.topics, "all", "recent", "gems"]);
const playlists = new Set(routes.playlists);

const notFound = (req: NextRequest) => NextResponse.rewrite(new URL("/_404", req.url));

// Generated social images live under the page path, e.g. /watch/{id}/{slug}/opengraph-image/card.
const IMAGE_ROUTES = new Set(["opengraph-image", "twitter-image"]);

export function proxy(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const image = parts.findIndex((p) => IMAGE_ROUTES.has(p));
  const [section, id, slug, ...rest] = image === -1 ? parts : parts.slice(0, image);
  if (!id) return NextResponse.next();
  if (image !== -1) {
    const known =
      section === "watch" ? Boolean(videos[id]) : section === "c" ? topics.has(id) : playlists.has(id);
    return known ? NextResponse.next() : notFound(req);
  }

  if (section === "watch") {
    const vid = aliases[id] ?? id;
    const title = videos[vid];
    if (!title || rest.length) return notFound(req);
    const canonical = slugify(title);
    if (vid !== id || slug !== canonical) {
      const url = req.nextUrl.clone();
      url.pathname = `/watch/${vid}/${canonical}`;
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }
  if (section === "c" && (!topics.has(id) || slug)) return notFound(req);
  if (section === "p" && (!playlists.has(id) || slug)) return notFound(req);
  return NextResponse.next();
}

export const config = { matcher: ["/watch/:path+", "/c/:path+", "/p/:path+"] };
