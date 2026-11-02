"""Pull YouTube video ids out of the raw HN items and group mentions by video.

    python 02_extract.py   # writes data/mentions_raw.jsonl, data/videos_raw.jsonl

A "mention" is one HN item (comment or story submission) linking one video.
Per video we keep the counts the threshold is applied to: distinct authors and
distinct calendar months.
"""
import html
import json
import re
from collections import defaultdict
from pathlib import Path
from time import gmtime, strftime

DATA = Path(__file__).parent / "data"

YT = re.compile(
    r"(?:youtube(?:-nocookie)?\.com/"
    r"(?:(?:watch/?)?(?:\?|#!)(?:[^\s\"'<>]*?[&;?])?v=|(?:embed|v|shorts|live|e)/)"
    r"|youtu\.be/)"
    r"([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])"
)
A_TAG = re.compile(r'<a\s+href="([^"]*)"[^>]*>.*?</a>', re.S)
TAG = re.compile(r"<[^>]+>")


def clean(raw):
    """HN comment HTML -> plain text, links replaced by their href."""
    if not raw:
        return ""
    t = raw.replace("<p>", "\n\n")
    t = A_TAG.sub(lambda m: m.group(1), t)
    t = TAG.sub("", t)
    return html.unescape(t).strip()


def ids(text):
    seen = []
    for v in YT.findall(text or ""):
        if v not in seen:
            seen.append(v)
    return seen


def main():
    mentions = []
    for row in map(json.loads, open(DATA / "raw" / "comments.jsonl")):
        text = clean(row.get("comment_text"))
        vids = ids(text)
        for v in vids:
            mentions.append({
                "vid": v, "id": row["id"], "kind": "comment", "author": row.get("author"),
                "t": row["created_at_i"], "story_id": row.get("story_id"),
                "story_title": row.get("story_title") or "", "n_vids": len(vids), "text": text,
            })
    for row in map(json.loads, open(DATA / "raw" / "stories.jsonl")):
        body = clean(row.get("story_text"))
        vids = ids(html.unescape(row.get("url") or "") + "\n" + body)
        for v in vids:
            mentions.append({
                "vid": v, "id": row["id"], "kind": "story", "author": row.get("author"),
                "t": row["created_at_i"], "story_id": row["id"],
                "story_title": row.get("title") or "", "n_vids": len(vids), "text": body,
                "points": row.get("points"), "num_comments": row.get("num_comments"),
            })

    by_vid = defaultdict(list)
    for m in mentions:
        m["month"] = strftime("%Y-%m", gmtime(m["t"]))
        by_vid[m["vid"]].append(m)

    videos = []
    for vid, ms in by_vid.items():
        authors = {m["author"] for m in ms if m["author"]}
        months = {m["month"] for m in ms}
        videos.append({
            "vid": vid, "mentions": len(ms), "authors": len(authors), "months": len(months),
            "stories": sum(m["kind"] == "story" for m in ms),
            "first": min(months), "last": max(months),
            "story_titles": sorted({m["story_title"] for m in ms if m["story_title"]})[:12],
        })
    videos.sort(key=lambda v: (-v["months"], -v["authors"]))

    with open(DATA / "mentions_raw.jsonl", "w") as f:
        for m in mentions:
            f.write(json.dumps(m, ensure_ascii=False) + "\n")
    with open(DATA / "videos_raw.jsonl", "w") as f:
        for v in videos:
            f.write(json.dumps(v, ensure_ascii=False) + "\n")

    print(f"{len(mentions):,} mentions of {len(videos):,} distinct videos")
    for a, mo in [(1, 1), (2, 1), (2, 2), (3, 2), (3, 3)]:
        n = sum(v["authors"] >= a and v["months"] >= mo for v in videos)
        print(f"  >= {a} authors & >= {mo} months: {n:,}")


if __name__ == "__main__":
    main()
