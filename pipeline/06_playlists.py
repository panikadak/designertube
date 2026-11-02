"""Compact list of the final videos for the playlist-curation agent (prompts/playlists.md).

    python 06_playlists.py   # after 05_export.py; writes data/llm/playlists/in.jsonl
The agent writes pipeline/playlists.json; rerun 05_export.py to publish it.
"""
import json

from common import LLM, ROOT, write_jsonl

videos = json.load(open(ROOT.parent / "web" / "data" / "videos.json"))
rows = [{
    "vid": v["vid"], "title": v["title"], "channel": v["channel"], "type": v["content_type"],
    "level": v["level"], "cats": [c["name"] for c in v["categories"]], "topic": v["primary_topic"],
    "score": v["score"], "design": v["design"], "summary": v["summary"].split(". ")[0][:160],
} for v in videos]
write_jsonl(LLM / "playlists" / "in.jsonl", rows)
print(f"{len(rows)} videos")
