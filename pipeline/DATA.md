# DesignerTube data

The YouTube videos that Hacker News keeps telling designers to watch, with everything HN said about them. This file is written for AI agents (and curious humans) who want to build something new on top of it.

## Files

| File | What |
|---|---|
| `videos.jsonl` | One design video per line, best first. |
| `mentions.jsonl` | One labeled HN comment (or story submission) per line, linking one of those videos. |
| `taxonomy.json` | Areas → topics, with synonym-rich descriptions and counts. |
| `related.jsonl` | "HN people also recommend": for a video, other videos recommended by the same HN users (counts only, no usernames). |
| `embeddings.npy` | `float32[N, 384]`, L2-normalized bge-small-en-v1.5 vectors of each video card, row order = `embedding_ids.json`. |
| `embedding_ids.json` | Video ids in embedding row order. |

## How it was made

1. **Collect.** Every HN comment and story mentioning `youtube` or `youtu.be` was pulled from the public Algolia HN Search API (2006 → present). Video ids were extracted from `watch?v=`, `youtu.be/`, `embed/`, `shorts/`, `live/` and `v/` links. Playlists, channels and searches are ignored.
2. **Candidates.** Videos linked by ≥2 different people in ≥2 different months. Title and channel come from YouTube's public oEmbed endpoint (no API key); videos that are deleted, private or not embeddable are dropped.
3. **Relevance.** Claude Sonnet read the title, channel and HN thread titles of every candidate and labeled it `core` (about design), `adjacent` (valuable to designers) or `no`.
4. **Labeling.** For `core`/`adjacent` videos, Claude Sonnet read every linking comment (up to 25 per video, spread over as many months as possible) with its thread title and labeled the stance, a short why, a verbatim quote and topics.
5. **Threshold.** A video is kept if ≥2 distinct people *recommended* it (`strong` or `rec`) in ≥2 distinct calendar months.
6. **Cards.** Claude Sonnet wrote each video's summary, why HN likes it, type, level, shelf life, tags and 1–3 taxonomy categories, and gave a final `design` verdict. The whole run was coordinated by Claude Opus in Claude Code.
7. **Score.** `rec_months + 0.5 × min(strong, 2)`, minus 0.5 for `adjacent` videos.

## `videos.jsonl` fields

| Field | Meaning |
|---|---|
| `vid`, `url` | YouTube id and watch URL. |
| `title`, `channel` | From YouTube oEmbed. |
| `summary` | 2–3 sentences on what the video is. |
| `why_hn` | One sentence on why HN people recommend it. |
| `content_type` | talk, lecture, keynote, documentary, interview, explainer, essay, demo, tutorial, course, panel, animation, other. |
| `level` | general, intermediate, expert. |
| `shelf_life` | evergreen, dated, historical (valued as a record of its time). |
| `primary_topic`, `tags` | Free-text topic phrase and 3–6 tags. |
| `categories` | 1–3 `{id, name, area, area_name}` from the taxonomy, best first. |
| `quote` | `{text, id, year}`: a pull quote and the HN item it came from, or null. |
| `design` | `core` or `adjacent`. |
| `hn.mentions` | Labeled mentions (capped at 25 per video). |
| `hn.recommenders` | Distinct users with a `strong`/`rec` stance. |
| `hn.stances` | Count per stance. |
| `hn.rec_months` | Distinct months with a recommendation. The main quality signal. |
| `hn.strong` | Number of `strong` recommendations. |
| `hn.first`, `hn.last`, `hn.last_rec` | First/last year mentioned; last month recommended. |
| `score` | Ranking score (see above). |
| `whys` | Short reasons from individual recommenders. |

## `mentions.jsonl` fields

`id` and `hn_url` (the HN item), `vid`, `author`, `month` (YYYY-MM), `kind` (`comment` or `story`), `story_id`, `story_title` (the thread), `stance`, `why`, `quote`, `text` (comment as plain text, links kept as URLs, truncated at 4000 chars).

### Stances

- `strong` — emphatic personal recommendation ("best talk I've seen").
- `rec` — recommends it; a story submission of the video also counts as `rec`.
- `reference` — cites it as a source or example without endorsing it.
- `joke` — used for humor.
- `critique` — criticizes it.
- `bare` — just a link (bare comment mentions are not exported; story submissions are).

## Example

```python
import json, numpy as np
videos = [json.loads(l) for l in open("videos.jsonl")]
emb = np.load("embeddings.npy"); ids = json.load(open("embedding_ids.json"))
row = {v: i for i, v in enumerate(ids)}
# 10 nearest neighbours of the top video
q = emb[row[videos[0]["vid"]]]
for i in np.argsort(-(emb @ q))[1:11]:
    print(ids[i])
# for free-text search, embed the query with BAAI/bge-small-en-v1.5 using the
# "Represent this sentence for searching relevant passages: " prefix
```

## Gotchas

- YouTube's own metadata (description, view count, duration, upload date) is not included. Every record has the id; fetch it with the YouTube Data API if you need it.
- Titles can change on YouTube; ours are from the time of collection.
- `hn.mentions` is capped at 25 labeled comments per video, so very famous videos are undercounted in `mentions`, not in `rec_months` ordering.
- Hacker News is a tech crowd. "Design" here is what designers and design-minded engineers on HN recommend, which over-represents HCI, interaction design and tools-for-thought, and under-represents fashion or fine art.

## License

ODC-By 1.0, like the Hacker News data it is derived from. Use it for anything; credit DesignerTube. Comment text belongs to its authors and is included as it appears publicly on Hacker News.
