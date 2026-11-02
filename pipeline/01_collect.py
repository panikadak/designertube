"""Collect every HN comment and story that mentions YouTube, via the public Algolia HN API.

Algolia caps a single query at 1000 hits. The time range is cut into yearly chunks
(one worker each); a chunk whose window has more than 1000 hits is split into
equal sub-windows sized from the hit count, recursively. Each chunk writes its own
part file and a .done marker, so the run is resumable. Parts are merged (deduped)
into data/raw/{comments,stories}.jsonl at the end.

    python 01_collect.py
"""
import calendar
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

API = "https://hn.algolia.com/api/v1/search_by_date"
START = 1160418111  # first HN item (Oct 2006)
END = int(time.time()) + 86400
QUERIES = {"youtube": "yt", "youtu.be": "ytbe"}  # query -> part file label
FIELDS = {
    "comment": "author,created_at_i,story_id,story_title,story_url,parent_id,comment_text",
    "story": "author,created_at_i,title,url,story_text,points,num_comments",
}
RAW = Path(__file__).parent / "data" / "raw"
PARTS = RAW / "parts"
WORKERS = 6


def get(params, tries=8):
    url = API + "?" + urllib.parse.urlencode(params)
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return json.load(r)
        except Exception as e:  # rate limit / transient
            wait = min(60, 2 ** i)
            print(f"  retry {i+1} in {wait}s: {e}", file=sys.stderr, flush=True)
            time.sleep(wait)
    raise RuntimeError(f"failed: {url}")


def query(q, tag, lo, hi):
    return get({
        "query": q, "tags": tag, "hitsPerPage": 1000,
        "numericFilters": f"created_at_i>={lo},created_at_i<{hi}",
        "attributesToRetrieve": FIELDS[tag],
        "attributesToHighlight": "", "attributesToSnippet": "",
    })


def run_chunk(q, tag, lo, hi, name):
    out, done = PARTS / f"{name}.jsonl", PARTS / f"{name}.done"
    if done.exists():
        return name, 0
    rows, stack = 0, [(lo, hi)]
    with open(out, "w") as fh:
        while stack:
            a, b = stack.pop()
            d = query(q, tag, a, b)
            n = d["nbHits"]
            if n > 1000 and b - a > 1:
                k = min(64, math.ceil(n / 700))
                step = math.ceil((b - a) / k)
                stack += [(s, min(b, s + step)) for s in reversed(range(a, b, step))]
                continue
            for h in d["hits"]:
                h["id"] = int(h.pop("objectID"))
                fh.write(json.dumps(h, ensure_ascii=False) + "\n")
                rows += 1
    done.touch()
    return name, rows


def chunks():
    years = list(range(2006, time.gmtime().tm_year + 1))
    edges = [START] + [calendar.timegm((y, 1, 1, 0, 0, 0)) for y in years[1:]] + [END]
    until = RAW / "youtube_comments_until.txt"
    resume = int(until.read_text()) if until.exists() else START
    for tag in ["comment", "story"]:
        for q in QUERIES:
            for lo, hi in zip(edges, edges[1:]):
                if tag == "comment" and q == "youtube":
                    if hi <= resume:
                        continue  # already in comment_yt_0000
                    lo = max(lo, resume)
                yield q, tag, lo, hi, f"{tag}_{QUERIES[q]}_{time.gmtime(lo).tm_year}"


def merge():
    for tag, name in [("comment", "comments"), ("story", "stories")]:
        seen, n = set(), 0
        with open(RAW / f"{name}.jsonl", "w") as fh:
            for p in sorted(PARTS.glob(f"{tag}_*.jsonl")):
                for line in open(p):
                    try:
                        r = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if r["id"] in seen:
                        continue
                    seen.add(r["id"])
                    fh.write(line if line.endswith("\n") else line + "\n")
                    n += 1
        print(f"merged {name}: {n:,} rows", flush=True)


def main():
    PARTS.mkdir(parents=True, exist_ok=True)
    todo = list(chunks())
    print(f"{len(todo)} chunks, {WORKERS} workers", flush=True)
    with ThreadPoolExecutor(WORKERS) as pool:
        futs = [pool.submit(run_chunk, *c) for c in todo]
        for f in as_completed(futs):
            name, rows = f.result()
            print(f"done {name}: {rows:,} rows", flush=True)
    merge()


if __name__ == "__main__":
    main()
