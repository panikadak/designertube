# Task: write a DesignerTube card for each video

DesignerTube shows the YouTube videos Hacker News people keep recommending to each other, filtered for designers. Each video gets a short card built from its title, channel and what HN actually said about it.

## Input

A JSONL file. One video per line:

```json
{"vid": "...", "title": "...", "channel": "...",
 "hn": {"recommenders": 5, "rec_months": 4, "first": "2012", "last": "2023"},
 "mentions": [{"id": 1, "stance": "rec", "why": "...", "quote": "...", "story_title": "...", "year": "2014", "text": "the comment around the link"}]}
```

The topic list (`taxonomy.json`, path given in your instructions) has areas and topics with ids and descriptions.

## Output

Write a JSONL file (path given in your instructions) with exactly one line per input video, same order:

```json
{"vid": "...",
 "summary": "2–3 sentences: what the video is and what it covers.",
 "why_hn": "1 sentence: why HN people recommend it, in their terms.",
 "content_type": "talk | lecture | keynote | documentary | interview | explainer | essay | demo | tutorial | course | panel | animation | other",
 "level": "general | intermediate | expert",
 "shelf_life": "evergreen | dated | historical",
 "primary_topic": "short lowercase phrase",
 "tags": ["3–6 short lowercase tags"],
 "categories": ["1–3 topic ids from taxonomy.json, best first"],
 "quote_id": 1,
 "design": "core | adjacent | no"}
```

## Guidance

- **summary**: Plain, specific, no hype. Who is speaking (if known from title/channel/comments), what they show or argue. You may use well-established public knowledge of famous talks and documentaries (e.g. Bret Victor's *Inventing on Principle*, the *Helvetica* documentary), but never invent details you are unsure of; if the material is thin, write a shorter, general summary.
- **why_hn**: Synthesize the mentions' `why` fields. E.g. "HN treats it as the clearest case for immediate feedback in creative tools."
- **level**: `general` = anyone can watch; `intermediate` = assumes some design or tech familiarity; `expert` = for practitioners/researchers.
- **shelf_life**: `evergreen` = still fully relevant; `dated` = specifics have aged (old tools, old web); `historical` = valued *because* it is a record of its time (e.g. the 1968 Mother of All Demos).
- **categories**: Choose from the taxonomy ids only. Put the best fit first. Use 2–3 only when the video genuinely spans them.
- **quote_id**: the `id` of the mention with the best pull quote (a strong, specific, quotable `quote`); `null` if none is good.
- **design**: a final check with all the evidence. `core` = about design; `adjacent` = valuable to designers but not about design; `no` = not a design video after all.

Process every line. Write nothing except the output file.
