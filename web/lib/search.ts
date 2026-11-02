// Hybrid search: field-weighted BM25 over the video cards, fused (reciprocal rank) with a
// semantic ranking. The query vector comes from precomputed phrase embeddings, so videos
// that never use the query's words can still be found by topic.
import { embeddings, taxonomy, videos, vocab } from "./data";
import type { Video } from "./types";

const STOP = new Set(
  "a an and are as at be by for from has have how i in is it its of on or that the this to was what when where who why will with you your about into than then them they".split(" "),
);

export function tokens(s: string): string[] {
  return (s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]+/g) ?? [])
    .filter((t) => !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));
}

type Index = { docs: Map<string, number>[]; len: number[]; avg: number; df: Map<string, number> };
let _idx: Index | undefined;

function index(): Index {
  if (_idx) return _idx;
  const desc = new Map<string, string>();
  for (const a of taxonomy()) for (const t of a.topics) desc.set(t.id, `${t.name} ${t.description}`);

  const docs: Map<string, number>[] = [];
  const len: number[] = [];
  const df = new Map<string, number>();
  for (const v of videos()) {
    const tf = new Map<string, number>();
    const add = (text: string | undefined, w: number) => {
      for (const t of tokens(text ?? "")) tf.set(t, (tf.get(t) ?? 0) + w);
    };
    add(v.title, 3);
    add(v.tags.join(" "), 2);
    add(v.primary_topic, 2);
    add(v.channel, 1.5);
    add(v.categories.map((c) => c.name).join(" "), 1.5);
    add(v.categories.map((c) => desc.get(c.id)).join(" "), 0.3);
    add(v.summary, 1);
    add(v.why_hn, 1);
    add(v.whys.join(" "), 0.4);
    docs.push(tf);
    len.push([...tf.values()].reduce((a, b) => a + b, 0));
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const avg = len.reduce((a, b) => a + b, 0) / Math.max(1, len.length);
  return (_idx = { docs, len, avg, df });
}

const DIM = 384;

/** Query vector from the phrase vocabulary: the whole query if known, else its 2- and 1-grams. */
function queryVector(qt: string[]): Float32Array | null {
  const { keys, vecs } = vocab();
  if (!keys.size) return null;
  const hits: number[] = [];
  const whole = keys.get(qt.join(" "));
  if (whole !== undefined) hits.push(whole);
  else {
    for (let i = 0; i < qt.length; i++) {
      const bi = i + 1 < qt.length ? keys.get(`${qt[i]} ${qt[i + 1]}`) : undefined;
      if (bi !== undefined) {
        hits.push(bi);
        i++;
      } else {
        const uni = keys.get(qt[i]);
        if (uni !== undefined) hits.push(uni);
      }
    }
  }
  if (!hits.length) return null;
  const q = new Float32Array(DIM);
  for (const h of hits) for (let d = 0; d < DIM; d++) q[d] += vecs[h * DIM + d];
  let n = 0;
  for (let d = 0; d < DIM; d++) n += q[d] * q[d];
  n = Math.sqrt(n) || 1;
  for (let d = 0; d < DIM; d++) q[d] /= n;
  return q;
}

function semantic(qt: string[], limit: number): number[] {
  const q = queryVector(qt);
  const E = embeddings();
  const N = videos().length;
  if (!q || E.length !== N * DIM) return [];
  const sims: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let d = 0; d < DIM; d++) s += E[i * DIM + d] * q[d];
    sims.push([s, i]);
  }
  sims.sort((a, b) => b[0] - a[0]);
  const top = sims[0]?.[0] ?? 0;
  return sims.filter(([s]) => s >= top - 0.08).slice(0, limit).map(([, i]) => i);
}

function lexical(q: string, qt: string[]): number[] {
  const { docs, len, avg, df } = index();
  const all = videos();
  const N = all.length;
  const k1 = 1.2;
  const b = 0.75;
  const phrase = q.trim().toLowerCase();
  const scored: [number, number][] = [];
  docs.forEach((tf, i) => {
    let s = 0;
    let hits = 0;
    for (const t of qt) {
      const f = tf.get(t);
      if (!f) continue;
      hits++;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * len[i]) / avg)));
    }
    if (!s) return;
    s *= 0.5 + (0.5 * hits) / qt.length; // prefer documents matching every term
    if (all[i].title.toLowerCase().includes(phrase)) s *= 1.6;
    s *= 1 + 0.05 * Math.log1p(all[i].score); // nudge toward well-loved videos
    scored.push([s, i]);
  });
  return scored.sort((a, b) => b[0] - a[0]).map(([, i]) => i);
}

export function search(q: string, limit = 60): Video[] {
  const qt = [...new Set(tokens(q))];
  if (!qt.length) return [];
  const fused = new Map<number, number>();
  const K = 60;
  lexical(q, qt).slice(0, 200).forEach((i, r) => fused.set(i, (fused.get(i) ?? 0) + 1 / (K + r)));
  semantic(qt, 100).forEach((i, r) => fused.set(i, (fused.get(i) ?? 0) + 0.8 / (K + r)));
  const all = videos();
  return [...fused]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([i]) => all[i]);
}
