"""Fetch title + channel for candidate videos from YouTube's public oEmbed endpoint (no API key).

    python 03_titles.py [min_authors] [min_months]   # default 2 2

Resumable: results are appended to data/oembed.jsonl and skipped on rerun.
A 401/403/404 means the video is gone, private or not embeddable; we record the
status and drop it later.
"""
import json
import ssl
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

DATA = Path(__file__).parent / "data"
OUT = DATA / "oembed.jsonl"
MIN_AUTHORS = int(sys.argv[1]) if len(sys.argv) > 1 else 2
MIN_MONTHS = int(sys.argv[2]) if len(sys.argv) > 2 else 2
lock = threading.Lock()
CTX = ssl.create_default_context()  # building one per request re-reads the CA bundle every time


def fetch(vid):
    url = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(
        f"https://www.youtube.com/watch?v={vid}")
    for i in range(5):
        try:
            with urllib.request.urlopen(url, timeout=30, context=CTX) as r:
                d = json.load(r)
            return {"vid": vid, "status": 200, "title": d.get("title"),
                    "channel": d.get("author_name"), "channel_url": d.get("author_url")}
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403, 404):
                return {"vid": vid, "status": e.code}
            time.sleep(2 ** i)
        except Exception:
            time.sleep(2 ** i)
    return None


def main():
    done = set()
    if OUT.exists():
        done = {json.loads(l)["vid"] for l in open(OUT)}
    todo = [v["vid"] for v in map(json.loads, open(DATA / "videos_raw.jsonl"))
            if v["authors"] >= MIN_AUTHORS and v["months"] >= MIN_MONTHS and v["vid"] not in done]
    print(f"{len(done):,} cached, {len(todo):,} to fetch", flush=True)
    n = 0
    with open(OUT, "a") as fh, ThreadPoolExecutor(24) as pool:
        for res in pool.map(fetch, todo):
            if res is None:
                continue
            with lock:
                fh.write(json.dumps(res, ensure_ascii=False) + "\n")
                n += 1
                if n % 500 == 0:
                    fh.flush()
                    print(f"  {n:,}/{len(todo):,}", flush=True)
    print(f"DONE {n:,} fetched", flush=True)


if __name__ == "__main__":
    main()
