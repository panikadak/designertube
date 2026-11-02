// Server-side access to the dataset produced by ../pipeline (web/data/*.json).
import fs from "node:fs";
import path from "node:path";
import type { Area, Mention, Playlist, Video } from "./types";

const DIR = path.join(process.cwd(), "data");

function load<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

type Meta = {
  videos: number;
  mentions: number;
  topics: number;
  areas: number;
  years: [string, string];
  zip?: { name: string; bytes: number };
  files?: { name: string; description: string; bytes: number }[];
};

let _videos: Video[] | undefined;
let _byId: Map<string, Video> | undefined;
let _mentions: Record<string, Mention[]> | undefined;

export function videos(): Video[] {
  return (_videos ??= load<Video[]>("videos.json", []));
}

export function byId(): Map<string, Video> {
  return (_byId ??= new Map(videos().map((v) => [v.vid, v])));
}

export const video = (vid: string) => byId().get(vid);

let _alias: Map<string, string> | undefined;
/** The merged video an older duplicate upload now lives under. */
export function canonical(vid: string) {
  _alias ??= new Map(videos().flatMap((v) => (v.aliases ?? []).map((a) => [a, v.vid] as [string, string])));
  return _alias.get(vid);
}

export function mentions(vid: string): Mention[] {
  _mentions ??= load<Record<string, Mention[]>>("mentions.json", {});
  return _mentions[vid] ?? [];
}

let _emb: Float32Array | undefined;
let _vocab: { keys: Map<string, number>; vecs: Int8Array } | undefined;

/** L2-normalized bge-small vectors of each video card, row order = videos(). */
export function embeddings(): Float32Array {
  if (_emb) return _emb;
  try {
    const b = fs.readFileSync(path.join(DIR, "emb.f32"));
    _emb = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
  } catch {
    _emb = new Float32Array(0);
  }
  return _emb;
}

/** Query-side phrase vectors (int8, scaled by 127) used to embed search queries without a model. */
export function vocab() {
  if (_vocab) return _vocab;
  const keys = load<string[]>("vocab.json", []);
  let vecs = new Int8Array(0);
  try {
    const b = fs.readFileSync(path.join(DIR, "vocab.i8"));
    vecs = new Int8Array(b.buffer, b.byteOffset, b.byteLength);
  } catch {}
  return (_vocab = { keys: new Map(keys.map((k, i) => [k, i])), vecs });
}

export const taxonomy = () => load<Area[]>("taxonomy.json", []);
export const playlists = () => load<Playlist[]>("playlists.json", []);
export const meta = () =>
  load<Meta>("meta.json", { videos: 0, mentions: 0, topics: 0, areas: 0, years: ["", ""] });

export function topic(id: string) {
  for (const a of taxonomy()) {
    const t = a.topics.find((t) => t.id === id);
    if (t) return { ...t, area: a };
  }
  return undefined;
}

/** Years between a YYYY-MM month and the newest recommendation in the dataset (static, so prerender-safe). */
let _latest: number | undefined;
export function yearsBeforeLatest(ym: string) {
  _latest ??= Math.max(...videos().map((v) => (v.hn.last_rec ? new Date(v.hn.last_rec + "-01").getTime() : 0)));
  return ym ? (_latest - new Date(ym + "-01").getTime()) / (365.25 * 864e5) : 99;
}

export const inTopic = (id: string) => videos().filter((v) => v.categories.some((c) => c.id === id));
export const inArea = (id: string) => videos().filter((v) => v.categories.some((c) => c.area === id));

/** Long-form: an hour or more if durations are known, otherwise lectures/courses/documentaries. */
export function isLong(v: Video) {
  if (v.duration_s) return v.duration_s >= 3600;
  return ["lecture", "course", "documentary", "panel"].includes(v.content_type);
}
