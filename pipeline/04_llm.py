"""Prepare input batches for the three LLM stages and report their progress.

Each stage reads data/llm/<stage>/in_NNN.jsonl and an agent writes out_NNN.jsonl
following prompts/<stage>.md.

    python 04_llm.py relevance [size]               # which candidates are design videos
    python 04_llm.py label [size]                    # stance/why/quote for each HN mention
    python 04_llm.py card [size]                     # summary/why/categories for each video
    python 04_llm.py status
"""
import sys
from collections import defaultdict

from common import DATA, LLM, around, jsonl, read_outputs, write_batches

MAX_MENTIONS = 25          # labeled per video; enough to measure lasting recommendation
MIN_RECOMMENDERS = 2       # HackerTube uses 3 people / 3 months; we lower it for a niche
MIN_REC_MONTHS = 2
REC = {"strong", "rec"}


def mentions_by_vid(keep):
    by = defaultdict(list)
    for m in jsonl(DATA / "mentions_raw.jsonl"):
        if m["vid"] in keep:
            by[m["vid"]].append(m)
    return by


def titles():
    return {d["vid"]: d for d in jsonl(DATA / "oembed.jsonl") if d["status"] == 200}


def relevance(size=1000):
    """Every live candidate, judged from title, channel and the HN threads it was shared in."""
    t = titles()
    done = {r["vid"] for r in read_outputs("relevance")}  # e.g. out_pilot.jsonl
    rows = [{
        "vid": v["vid"], "title": t[v["vid"]]["title"], "channel": t[v["vid"]]["channel"],
        "threads": [s[:90] for s in v["story_titles"][:2]],
    } for v in jsonl(DATA / "videos_raw.jsonl") if v["vid"] in t and v["vid"] not in done]
    n = write_batches("relevance", rows, size)
    print(f"{len(rows):,} candidates in {n} batches of {size}")


def sample(ms):
    """Up to MAX_MENTIONS mentions, covering as many distinct months as possible."""
    if len(ms) <= MAX_MENTIONS:
        return ms
    ms = sorted(ms, key=lambda m: -len(m["text"]))
    picked, months = [], set()
    for m in ms:
        if m["month"] not in months:
            picked.append(m)
            months.add(m["month"])
    for m in ms:
        if len(picked) >= MAX_MENTIONS:
            break
        if m not in picked:
            picked.append(m)
    return picked[:MAX_MENTIONS]


def label(size=300):
    rel = {r["vid"]: r["design"] for r in read_outputs("relevance")}
    raw_stats = {v["vid"]: v for v in jsonl(DATA / "videos_raw.jsonl") if v["vid"] in rel}
    # all core videos; adjacent ones only with a stronger HN signal, to keep the site about design
    keep = {v for v, d in rel.items() if d == "core" or (
        d == "adjacent" and raw_stats[v]["authors"] >= 3 and raw_stats[v]["months"] >= 3)}
    t = titles()
    by = mentions_by_vid(keep)
    done = {(r["vid"], r["id"]) for r in read_outputs("label")}  # e.g. out_pilot.jsonl
    rows = []
    for vid in sorted(keep):
        for m in sample(by[vid]):
            if (vid, m["id"]) in done:
                continue
            rows.append({
                "id": m["id"], "vid": vid, "video_title": t[vid]["title"], "channel": t[vid]["channel"],
                "story_title": m["story_title"], "kind": m["kind"], "n_vids": m["n_vids"],
                "text": " ".join(around(m["text"], vid, 700, 300).split()) if m["text"] else "",
            })
    n = write_batches("label", rows, size)
    print(f"{len(keep):,} design videos -> {len(rows):,} mentions in {n} batches of {size}")


def video_stats(labels, raw):
    """HN stats for one video from its labeled mentions."""
    rec = [l for l in labels if l["stance"] in REC]
    months = {raw[l["id"]]["month"] for l in rec}
    years = sorted(raw[l["id"]]["month"][:4] for l in labels)
    stances = defaultdict(int)
    for l in labels:
        stances[l["stance"]] += 1
    return {
        "mentions": len(labels),
        "recommenders": len({raw[l["id"]]["author"] for l in rec}),
        "stances": dict(stances),
        "rec_months": len(months),
        "strong": stances["strong"],
        "first": years[0] if years else "",
        "last": years[-1] if years else "",
        "last_rec": max(months) if months else "",
    }


def card(size=100):
    labels = defaultdict(list)
    for l in read_outputs("label"):
        labels[l["vid"]].append(l)
    by = mentions_by_vid(set(labels))
    t = titles()
    rows = []
    for vid, ls in labels.items():
        raw = {m["id"]: m for m in by[vid]}
        ls = [l for l in ls if l["id"] in raw]
        hn = video_stats(ls, raw)
        if hn["recommenders"] < MIN_RECOMMENDERS or hn["rec_months"] < MIN_REC_MONTHS:
            continue
        order = {"strong": 0, "rec": 1, "reference": 2, "critique": 3, "joke": 4, "bare": 5}
        ls = sorted(ls, key=lambda l: (order.get(l["stance"], 9), -len(raw[l["id"]]["text"])))[:8]
        rows.append({
            "vid": vid, "title": t[vid]["title"], "channel": t[vid]["channel"],
            "hn": {k: hn[k] for k in ("recommenders", "rec_months", "first", "last")},
            "mentions": [{
                "id": l["id"], "stance": l["stance"], "why": l.get("why", ""), "quote": l.get("quote", ""),
                "story_title": raw[l["id"]]["story_title"], "year": raw[l["id"]]["month"][:4],
                "text": " ".join(around(raw[l["id"]]["text"], vid, 300, 150).split()),
            } for l in ls],
        })
    rows.sort(key=lambda r: -r["hn"]["rec_months"])
    n = write_batches("card", rows, size)
    print(f"{len(rows):,} videos pass >= {MIN_RECOMMENDERS} recommenders & >= {MIN_REC_MONTHS} months -> {n} batches")


def status():
    for stage in ["relevance", "label", "card"]:
        d = LLM / stage
        ins = sorted(d.glob("in_*.jsonl")) if d.exists() else []
        if not ins:
            continue
        done, missing = 0, []
        for p in ins:
            out = p.with_name(p.name.replace("in_", "out_"))
            n_in = sum(1 for _ in open(p))
            n_out = sum(1 for _ in open(out)) if out.exists() else 0
            if n_out >= n_in:
                done += 1
            else:
                missing.append(f"{p.stem[3:]}({n_out}/{n_in})")
        print(f"{stage}: {done}/{len(ins)} batches done" + (f"; incomplete: {' '.join(missing)}" if missing else ""))


if __name__ == "__main__":
    cmd, args = sys.argv[1], [float(a) if "." in a else int(a) for a in sys.argv[2:]]
    {"relevance": relevance, "label": label, "card": card, "status": status}[cmd](*args)
