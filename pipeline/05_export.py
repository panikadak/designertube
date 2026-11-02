"""Assemble the final dataset from the LLM outputs and write it for the web app.

    .venv/bin/python 05_export.py

Writes web/data/{videos,mentions,taxonomy,playlists,meta}.json, web/data/emb.f32
and the downloadable zip at web/public/data/designertube-data.zip.
"""
import json
import re
import time
import unicodedata
import zipfile
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path

import numpy as np

from common import DATA, ROOT, jsonl, read_outputs, write_jsonl

WEB = ROOT.parent / "web"
OUT = WEB / "data"
EXPORT = DATA / "export"
ZIP = WEB / "public" / "data" / "designertube-data.zip"
REC = {"strong", "rec"}
MIN_RECOMMENDERS = 2
MIN_REC_MONTHS = 2
KEEP_DESIGN = {"core", "adjacent"}


STOP = set("a an and are as at be by for from has have how i in is it its of on or that the this to was what when "
           "where who why will with you your about into than then them they".split())


def tokens(s):
    """Mirror of tokens() in web/lib/search.ts; both sides must normalize identically."""
    s = "".join(c for c in unicodedata.normalize("NFKD", s.lower()) if not unicodedata.combining(c))
    out = []
    for t in re.findall(r"[a-z0-9]+", s):
        if t in STOP:
            continue
        out.append(t[:-1] if len(t) > 4 and t.endswith("s") and not t.endswith("ss") else t)
    return out


def vocab(videos):
    """Phrases a query can be mapped onto for semantic search: tags, topics, category names and
    title/tag 1-2 grams that occur at least twice."""
    whole, grams = set(), Counter()
    for v in videos:
        for p in v["tags"] + [v["primary_topic"]] + [c["name"] for c in v["categories"]]:
            k = " ".join(tokens(p))
            if k:
                whole.add(k)
        for text in [v["title"], " ".join(v["tags"]), v["primary_topic"]]:
            ts = tokens(text)
            grams.update(set(ts + [" ".join(ts[i:i + 2]) for i in range(len(ts) - 1)]))
    keys = sorted(whole | {g for g, n in grams.items() if n >= 2 and not g.isdigit()})
    return keys


def taxonomy():
    p = ROOT / "taxonomy.json"
    return json.load(open(p if p.exists() else ROOT / "taxonomy_seed.json"))["areas"]


def main():
    areas = taxonomy()
    topic_of = {t["id"]: (t, a) for a in areas for t in a["topics"]}
    titles = {d["vid"]: d for d in jsonl(DATA / "oembed.jsonl") if d["status"] == 200}
    cards = {c["vid"]: c for c in read_outputs("card")}
    labels = defaultdict(list)
    for l in read_outputs("label"):
        labels[l["vid"]].append(l)
    keep_vids = {v for v, c in cards.items() if c.get("design") in KEEP_DESIGN}

    # the same talk uploaded several times: fold every upload into the one HN mentions most
    alias, aliases = {}, defaultdict(list)
    mp = ROOT / "merges.json"
    for group in (json.load(open(mp))["groups"] if mp.exists() else []):
        group = [v for v in group if v in keep_vids]
        if len(group) < 2:
            continue
        canon = max(group, key=lambda v: len(labels[v]))
        for v in group:
            if v != canon:
                alias[v] = canon
                aliases[canon].append(v)
    raw = {}
    for m in jsonl(DATA / "mentions_raw.jsonl"):
        if m["vid"] in keep_vids:
            raw[(alias.get(m["vid"], m["vid"]), m["id"])] = m
    for dup, canon in alias.items():
        seen = {l["id"] for l in labels[canon]}
        labels[canon] += [{**l, "vid": canon} for l in labels.pop(dup) if l["id"] not in seen]
    keep_vids -= set(alias)

    videos, mentions_out, rec_authors = [], {}, {}
    for vid in keep_vids:
        c, t = cards[vid], titles[vid]
        ls = [l for l in labels[vid] if (vid, l["id"]) in raw]
        rec = [l for l in ls if l["stance"] in REC]
        rec_m = {raw[(vid, l["id"])]["month"] for l in rec}
        authors = {raw[(vid, l["id"])]["author"] for l in rec}
        if len(authors) < MIN_RECOMMENDERS or len(rec_m) < MIN_REC_MONTHS:
            continue
        stances = defaultdict(int)
        for l in ls:
            stances[l["stance"]] += 1
        months = sorted(raw[(vid, l["id"])]["month"] for l in ls)
        cats = []
        for cid in c.get("categories", [])[:3]:
            if cid in topic_of:
                tp, a = topic_of[cid]
                cats.append({"id": cid, "name": tp["name"], "area": a["id"], "area_name": a["name"]})
        if not cats:
            continue
        quote = None
        q = next((l for l in ls if l["id"] == c.get("quote_id") and l.get("quote")), None)
        if q:
            quote = {"text": q["quote"], "id": q["id"], "year": raw[(vid, q["id"])]["month"][:4]}
        strong = stances["strong"]
        videos.append({
            "vid": vid, "title": t["title"], "channel": t["channel"],
            "summary": c.get("summary", ""), "why_hn": c.get("why_hn", ""),
            "content_type": c.get("content_type", "other"), "level": c.get("level", "general"),
            "shelf_life": c.get("shelf_life", "evergreen"), "primary_topic": c.get("primary_topic", ""),
            "tags": c.get("tags", [])[:6], "categories": cats, "quote": quote,
            "design": c.get("design"), "aliases": aliases.get(vid, []),
            "hn": {
                "mentions": len(ls), "recommenders": len(authors), "stances": dict(stances),
                "rec_months": len(rec_m), "strong": strong,
                "first": months[0][:4], "last": months[-1][:4], "last_rec": max(rec_m),
            },
            "score": round(len(rec_m) + 0.5 * min(strong, 2) - (0.5 if c.get("design") == "adjacent" else 0), 2),
            "whys": [l["why"] for l in rec if l.get("why")][:8],
        })
        rec_authors[vid] = authors
        order = {"strong": 0, "rec": 1, "reference": 2, "critique": 3, "joke": 4, "bare": 5}
        mentions_out[vid] = [{
            "id": l["id"], "vid": vid, "author": raw[(vid, l["id"])]["author"],
            "month": raw[(vid, l["id"])]["month"], "kind": raw[(vid, l["id"])]["kind"],
            "story_id": raw[(vid, l["id"])]["story_id"], "story_title": raw[(vid, l["id"])]["story_title"],
            "stance": l["stance"], "why": l.get("why", ""), "quote": l.get("quote", ""),
            "text": raw[(vid, l["id"])]["text"][:4000],
        } for l in sorted(ls, key=lambda l: order.get(l["stance"], 9)) if l["stance"] != "bare"
            or raw[(vid, l["id"])]["kind"] == "story"]

    # optional YouTube Data API fields (07_youtube.py): upload date, duration, views
    yt = DATA / "youtube.jsonl"
    if yt.exists():
        meta_yt = {r["vid"]: r for r in jsonl(yt)}
        for v in videos:
            for k in ("published", "duration_s", "views"):
                if meta_yt.get(v["vid"], {}).get(k) is not None:
                    v[k] = meta_yt[v["vid"]][k]

    videos.sort(key=lambda v: (-v["score"], -v["hn"]["recommenders"]))
    ids = [v["vid"] for v in videos]

    # "HN people also recommend": shared recommenders, counts only
    by_author = defaultdict(set)
    for vid, au in rec_authors.items():
        for a in au:
            by_author[a].add(vid)
    co = defaultdict(lambda: defaultdict(int))
    for vids in by_author.values():
        if len(vids) > 60:  # prolific linkers say little about taste
            continue
        for a, b in combinations(sorted(vids), 2):
            co[a][b] += 1
            co[b][a] += 1
    for v in videos:
        rel = sorted(co[v["vid"]].items(), key=lambda x: -x[1])[:8]
        v["hn_related"] = [[k, n] for k, n in rel]

    # embeddings: similar videos + search vectors
    from fastembed import TextEmbedding
    model = TextEmbedding("BAAI/bge-small-en-v1.5")
    docs = [f"{v['title']}. {v['summary']} {v['why_hn']} Topics: {', '.join(v['tags'])}; "
            f"{', '.join(c['name'] for c in v['categories'])}." for v in videos]
    E = np.array(list(model.passage_embed(docs, batch_size=128)), dtype=np.float32)
    E /= np.linalg.norm(E, axis=1, keepdims=True)
    S = E @ E.T
    np.fill_diagonal(S, -1)
    for i, v in enumerate(videos):
        v["similar"] = [ids[j] for j in np.argsort(-S[i])[:12]]

    # taxonomy with counts
    counts = defaultdict(int)
    area_counts = defaultdict(set)
    for v in videos:
        for c in v["categories"]:
            counts[c["id"]] += 1
            area_counts[c["area"]].add(v["vid"])
    tax_out = [{
        "id": a["id"], "name": a["name"], "count": len(area_counts[a["id"]]),
        "topics": [{**t, "count": counts[t["id"]]} for t in a["topics"]],
    } for a in areas]

    OUT.mkdir(parents=True, exist_ok=True)
    json.dump(videos, open(OUT / "videos.json", "w"), ensure_ascii=False)
    json.dump(mentions_out, open(OUT / "mentions.json", "w"), ensure_ascii=False)
    json.dump(tax_out, open(OUT / "taxonomy.json", "w"), ensure_ascii=False, indent=1)
    # route table for web/proxy.ts: real 404s and 308s before anything renders
    json.dump({
        "videos": {v["vid"]: v["title"] for v in videos},
        "aliases": {a: v["vid"] for v in videos for a in v["aliases"]},
        "topics": [a["id"] for a in areas] + [t["id"] for a in areas for t in a["topics"]],
        "playlists": [pl["id"] for pl in (json.load(open(ROOT / "playlists.json")) if (ROOT / "playlists.json").exists() else [])],
    }, open(OUT / "routes.json", "w"), ensure_ascii=False)
    E.tofile(OUT / "emb.f32")
    keys = vocab(videos)
    V = np.array(list(model.query_embed(keys, batch_size=256)), dtype=np.float32)
    V /= np.linalg.norm(V, axis=1, keepdims=True)
    np.round(V * 127).astype(np.int8).tofile(OUT / "vocab.i8")
    json.dump(keys, open(OUT / "vocab.json", "w"))
    pl = ROOT / "playlists.json"
    playlists = [p for p in (json.load(open(pl)) if pl.exists() else [])]
    for p in playlists:
        p["vids"] = [v for v in p["vids"] if v in set(ids)]
    json.dump([p for p in playlists if len(p["vids"]) >= 3], open(OUT / "playlists.json", "w"), ensure_ascii=False, indent=1)

    # downloadable zip
    EXPORT.mkdir(parents=True, exist_ok=True)
    no_redistribute = ("similar", "hn_related", "published", "duration_s", "views")  # YouTube API data stays off the zip
    write_jsonl(EXPORT / "videos.jsonl", [{**{k: v[k] for k in v if k not in no_redistribute},
                                           "url": f"https://www.youtube.com/watch?v={v['vid']}"} for v in videos])
    write_jsonl(EXPORT / "mentions.jsonl", [{**m, "hn_url": f"https://news.ycombinator.com/item?id={m['id']}"}
                                            for vid in ids for m in mentions_out[vid]])
    write_jsonl(EXPORT / "related.jsonl", [{"vid": v["vid"], "hn_related": v["hn_related"]} for v in videos if v["hn_related"]])
    json.dump(tax_out, open(EXPORT / "taxonomy.json", "w"), ensure_ascii=False, indent=1)
    np.save(EXPORT / "embeddings.npy", E)
    json.dump(ids, open(EXPORT / "embedding_ids.json", "w"))
    (EXPORT / "DATA.md").write_text((ROOT / "DATA.md").read_text() if (ROOT / "DATA.md").exists() else "# DesignerTube data\n")
    descriptions = {
        "videos.jsonl": f"All {len(videos):,} videos: id, link, title, channel, summary, why HN likes it, type, level, shelf life, topics, categories, pull quote, HN stats and score",
        "mentions.jsonl": f"All {sum(len(m) for m in mentions_out.values()):,} labeled HN comments: id and link, author, month, thread title, stance, why, quote and comment text",
        "taxonomy.json": f"The {len(areas)} areas and {len(topic_of)} topics, with synonym-rich descriptions",
        "related.jsonl": "\"HN people also recommend\" (counts only, no usernames)",
        "embeddings.npy": "bge-small search vectors (384 dims) plus embedding_ids.json",
        "DATA.md": "How it was made, every field explained, for agents",
    }
    ZIP.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for f in ["videos.jsonl", "mentions.jsonl", "taxonomy.json", "related.jsonl", "embeddings.npy", "embedding_ids.json", "DATA.md"]:
            z.write(EXPORT / f, f"designertube-data/{f}")
    all_months = sorted(m["month"] for ms in mentions_out.values() for m in ms)
    meta = {
        "generated": time.strftime("%Y-%m-%d", time.gmtime()),
        "videos": len(videos), "mentions": sum(len(m) for m in mentions_out.values()),
        "topics": sum(1 for t in counts if counts[t]), "areas": sum(1 for a in tax_out if a["count"]),
        "years": [all_months[0][:4], all_months[-1][:4]],
        "zip": {"name": ZIP.name, "bytes": ZIP.stat().st_size},
        "files": [{"name": f, "description": d, "bytes": (EXPORT / f).stat().st_size} for f, d in descriptions.items()],
    }
    json.dump(meta, open(OUT / "meta.json", "w"), indent=1)
    core = sum(v["design"] == "core" for v in videos)
    print(f"{len(videos):,} videos ({core:,} core), {meta['mentions']:,} mentions, zip {ZIP.stat().st_size/1e6:.1f} MB")


if __name__ == "__main__":
    main()
