// Home feed: a deterministic, seeded mix of several kinds of picks.
// The client sends its likes / dislikes / seen ids; nothing is stored server-side.
import { byId, videos, yearsBeforeLatest as yearsAgo } from "./data";
import type { FeedItem, Video } from "./types";

export type FeedQuery = {
  like: string[];
  dislike: string[];
  seen: string[];
  seed: number;
  type?: string;
  level?: string;
  area?: string;
  shelf?: string;
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle within a ranking while keeping it roughly ordered: weighted by rank. */
function softShuffle<T>(ranked: T[], rand: () => number, temperature = 0.35): T[] {
  return ranked
    .map((x, i) => ({ x, k: i * (1 - temperature) + rand() * ranked.length * temperature }))
    .sort((a, b) => a.k - b.k)
    .map((o) => o.x);
}

export function passes(v: Video, q: Pick<FeedQuery, "type" | "level" | "area" | "shelf">) {
  if (q.type && v.content_type !== q.type) return false;
  if (q.level && v.level !== q.level) return false;
  if (q.shelf && v.shelf_life !== q.shelf) return false;
  if (q.area && !v.categories.some((c) => c.area === q.area)) return false;
  return true;
}

export function buildFeed(q: FeedQuery, limit = 600): FeedItem[] {
  const rand = rng(q.seed);
  const map = byId();
  const exclude = new Set([...q.dislike, ...q.like, ...q.seen]);
  const pool = videos().filter((v) => !exclude.has(v.vid) && passes(v, q));
  const disliked = q.dislike.map((id) => map.get(id)).filter(Boolean) as Video[];
  const dislikedCats = new Set(disliked.flatMap((v) => v.categories.slice(0, 1).map((c) => c.id)));
  const penal = (v: Video) => (dislikedCats.has(v.categories[0]?.id) ? 0.5 : 1);

  // --- sources -----------------------------------------------------------
  const byScore = pool.slice().sort((a, b) => b.score * penal(b) - a.score * penal(a));
  const classics = softShuffle(byScore.slice(0, Math.max(60, Math.floor(pool.length * 0.25))), rand);

  const gems = shuffle(
    pool.filter((v) => v.hn.recommenders <= 3 && (v.hn.strong >= 1 || v.hn.rec_months >= 2) && v.score > 0),
    rand,
  );

  const recent = softShuffle(
    pool.filter((v) => yearsAgo(v.hn.last_rec) <= 3).sort((a, b) => b.score - a.score),
    rand,
  );

  const liked = q.like.map((id) => map.get(id)).filter(Boolean) as Video[];
  const likedCats = new Set(liked.flatMap((v) => v.categories.map((c) => c.id)));
  const allCats = [...new Set(pool.flatMap((v) => v.categories.slice(0, 1).map((c) => c.id)))];
  const fresh = shuffle(allCats.filter((c) => !likedCats.has(c)), rand);
  const explore: FeedItem[] = [];
  for (const c of fresh) {
    const top = pool.filter((v) => v.categories[0]?.id === c).sort((a, b) => b.score - a.score).slice(0, 3);
    if (top.length) {
      const v = top[Math.floor(rand() * top.length)];
      explore.push({ ...v, reason: `Explore: ${v.categories[0].name}`, source: "explore" });
    }
  }

  const similar: FeedItem[] = [];
  const also: FeedItem[] = [];
  for (const l of shuffle(liked.slice(0, 30), rand)) {
    for (const id of l.similar ?? []) {
      const v = map.get(id);
      if (v && !exclude.has(id) && passes(v, q)) similar.push({ ...v, reason: `Because you liked “${l.title}”`, source: "similar" });
    }
    for (const [id] of l.hn_related ?? []) {
      const v = map.get(id);
      if (v && !exclude.has(id) && passes(v, q))
        also.push({ ...v, reason: `HN people who recommended “${l.title}” also recommend this`, source: "also" });
    }
  }

  const tag = (arr: Video[], reason: string, source: string): FeedItem[] => arr.map((v) => ({ ...v, reason, source }));
  const queues: Record<string, FeedItem[]> = {
    classics: tag(classics, "A Hacker News classic", "classics"),
    gems: tag(gems, "A hidden gem: few recommenders, all of them enthusiastic", "gems"),
    recent: tag(recent, "Recently recommended on HN", "recent"),
    explore,
    similar: shuffle(similar, rand),
    also: shuffle(also, rand),
  };

  // --- interleave --------------------------------------------------------
  const pattern = liked.length
    ? ["similar", "classics", "also", "similar", "gems", "recent", "similar", "explore", "classics", "also"]
    : ["classics", "classics", "gems", "recent", "classics", "explore", "classics", "gems", "recent", "classics"];

  const out: FeedItem[] = [];
  const used = new Set<string>();
  let i = 0;
  let stalls = 0;
  while (out.length < Math.min(limit, pool.length) && stalls < pattern.length * 2) {
    const q = queues[pattern[i++ % pattern.length]];
    let item: FeedItem | undefined;
    while (q.length && (!item || used.has(item.vid))) item = q.shift();
    if (item && !used.has(item.vid)) {
      out.push(item);
      used.add(item.vid);
      stalls = 0;
    } else stalls++;
  }
  // anything left, in score order
  for (const v of byScore) {
    if (out.length >= limit) break;
    if (!used.has(v.vid)) out.push({ ...v, reason: "A Hacker News classic", source: "classics" });
  }
  return out;
}

export function related(v: Video, n = 20): FeedItem[] {
  const map = byId();
  const out: FeedItem[] = [];
  const seen = new Set([v.vid]);
  const push = (id: string, reason: string, source: string) => {
    const r = map.get(id);
    if (r && !seen.has(id)) {
      seen.add(id);
      out.push({ ...r, reason, source });
    }
  };
  const also = (v.hn_related ?? []).map(([id]) => id);
  const sim = v.similar ?? [];
  for (let i = 0; out.length < n && (i < also.length || i < sim.length); i++) {
    if (i < sim.length) push(sim[i], "Similar", "similar");
    if (i < also.length) push(also[i], "HN people also recommend", "also");
  }
  if (out.length < n) {
    const cat = v.categories[0]?.id;
    videos()
      .filter((x) => x.categories[0]?.id === cat)
      .slice(0, n * 2)
      .forEach((x) => out.length < n && push(x.vid, `More in ${v.categories[0].name}`, "topic"));
  }
  return out;
}
