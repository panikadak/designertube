# Task: label Hacker News comments that link a YouTube video

DesignerTube ranks design videos by how often Hacker News people *genuinely recommend* them. A link is not always a recommendation, so every comment that links a video is read and labeled.

## Input

A JSONL file. One mention per line:

```json
{"id": 123, "vid": "abc", "video_title": "...", "channel": "...", "story_title": "HN thread the comment was posted under", "kind": "comment" | "story", "n_vids": 1, "text": "comment text; the link appears as a URL"}
```

`kind: "story"` means someone submitted the video itself to HN (the text is usually empty); `n_vids` is how many different videos the same comment links.

## Output

Write a JSONL file (path given in your instructions) with exactly one line per input line, same order:

```json
{"id": 123, "vid": "abc", "stance": "strong" | "rec" | "reference" | "joke" | "critique" | "bare", "why": "...", "quote": "...", "topics": ["...", "..."]}
```

### stance — what is the commenter doing with *this* video?

- **strong** — an emphatic, personal recommendation: "one of the best talks I've ever seen", "changed how I work", "required viewing", "watch this every year".
- **rec** — recommends it: "great talk on X", "worth watching", "highly recommend", or offers it as the answer to someone's question with approval.
- **reference** — cites it as a source, evidence or example without really endorsing it ("as shown in this video", "here's the clip", "relevant: …").
- **joke** — used for humor, a meme or a reaction clip.
- **critique** — criticizes or disagrees with the video.
- **bare** — just a link, or so little text that nothing can be said about intent.

A comment listing several videos as recommendations counts as **rec** for each (use **strong** only if this video is singled out emphatically). A story submission (`kind: "story"`) with no text is **rec**: the submitter thought it worth everyone's time.

### why

≤15 words: why this person brings up the video, in plain words, specific to what they said. Empty string for **bare**. Example: "Best explanation of why affordances matter, applies to every UI."

### quote

A short verbatim excerpt (≤25 words) from the comment that best says something about the video. Copy exactly, no ellipses inside. Empty string if nothing quotable.

### topics

1–4 short lowercase topics the comment associates with the video (e.g. "typography", "direct manipulation", "design systems", "dieter rams"). Empty list for **bare**.

## Notes

- Judge only from the comment text and thread title. Do not use outside knowledge to upgrade a stance.
- Process every line of the file. Write nothing except the output file.
