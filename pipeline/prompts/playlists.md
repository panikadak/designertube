# Task: curate DesignerTube playlists

You get the final list of DesignerTube videos (design videos Hacker News keeps recommending), one per line:

```json
{"vid": "...", "title": "...", "channel": "...", "type": "talk", "level": "general", "cats": ["UX process & practice", "..."], "topic": "primary topic", "score": 7.5, "summary": "first sentence"}
```

Create **12–18 playlists** that a designer would genuinely want to work through. Mix:

- 2–3 broad entry points, e.g. "Start here: the essential design talks" (the highest-scoring, most broadly loved), "Short and sharp: under-20-minute favorites" (only if you can tell from type/summary), "Hidden gems".
- Discipline paths following the site's areas, e.g. "Interaction design, from first principles", "Typography & type design", "Design systems in practice", "Service design and design strategy", "The design of everyday things", "Data visualization classics", "Game feel and game design for UI designers".
- Story/history lists, e.g. "How the GUI was invented", "Dieter Rams, Braun and Apple", "Designers in their own words".
- Idea lists that cut across categories, e.g. "Tools for thought", "Simplicity", "Dark patterns and design ethics".

Only make a playlist if there are at least 6 strong videos for it. Each playlist has 6–25 videos, ordered as a viewing sequence (foundations first). A video may appear in more than one playlist, but keep overlap modest.

## Output

Write a JSON file (path given in your instructions):

```json
[{"id": "kebab-case-id", "name": "Playlist name", "description": "One or two sentences on what this sequence gives you.", "vids": ["...", "..."]}]
```

Use only vids from the input. Valid JSON, nothing else in the file.
