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

export function proxy(req: NextRequest) {
  const [section, id, slug, ...rest] = req.nextUrl.pathname.split("/").filter(Boolean);
  if (!id) return NextResponse.next();

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
