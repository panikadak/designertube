"""Optional: YouTube Data API metadata (upload date, duration, views) for the final videos.

Google needs `uploadDate` for video rich results, and durations power the Longs page.
Needs a free API key (Google Cloud console > YouTube Data API v3 > Credentials):

    python 07_youtube.py   # key from $YOUTUBE_API_KEY or pipeline/.env; writes data/youtube.jsonl
    then rerun 05_export.py. The key stays on this machine: only the fetched fields reach the site.

Costs ~1 quota unit per 50 videos (the free daily quota is 10,000).
"""
import json
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request

from common import DATA, ROOT, write_jsonl

def env_key():
    p = ROOT / ".env"
    for line in open(p) if p.exists() else []:
        k, _, v = line.strip().partition("=")
        if k == "YOUTUBE_API_KEY":
            return v
    return None


KEY = os.environ.get("YOUTUBE_API_KEY") or env_key() or sys.exit("set YOUTUBE_API_KEY or add it to pipeline/.env")
CTX = ssl.create_default_context()


def seconds(iso):
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return None
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + s


videos = json.load(open(ROOT.parent / "web" / "data" / "videos.json"))
vids = [v["vid"] for v in videos]
rows = []
for i in range(0, len(vids), 50):
    q = urllib.parse.urlencode({"part": "snippet,contentDetails,statistics", "id": ",".join(vids[i:i + 50]), "key": KEY})
    with urllib.request.urlopen(f"https://www.googleapis.com/youtube/v3/videos?{q}", timeout=60, context=CTX) as r:
        for it in json.load(r).get("items", []):
            rows.append({
                "vid": it["id"],
                "published": it["snippet"].get("publishedAt"),
                "duration_s": seconds(it["contentDetails"].get("duration")),
                "views": int(it["statistics"]["viewCount"]) if "viewCount" in it.get("statistics", {}) else None,
            })
write_jsonl(DATA / "youtube.jsonl", rows)
print(f"{len(rows)}/{len(vids)} videos with YouTube metadata")
