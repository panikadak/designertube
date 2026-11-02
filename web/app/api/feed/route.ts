import type { NextRequest } from "next/server";
import { buildFeed } from "@/lib/feed";

const ids = (s: string | null, max: number) => (s ? s.split(",").filter(Boolean).slice(0, max) : []);

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const offset = Math.max(0, Number(p.get("offset")) || 0);
  const n = Math.min(60, Math.max(1, Number(p.get("n")) || 36));
  const feed = buildFeed({
    like: ids(p.get("like"), 60),
    dislike: ids(p.get("dislike"), 200),
    seen: ids(p.get("seen"), 300),
    seed: Number(p.get("seed")) || 1,
    type: p.get("type") || undefined,
    level: p.get("level") || undefined,
    area: p.get("area") || undefined,
    shelf: p.get("shelf") || undefined,
  });
  return Response.json(feed.slice(offset, offset + n));
}
