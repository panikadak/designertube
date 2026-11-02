# Task: is this a design video?

DesignerTube collects the YouTube videos that Hacker News commenters keep recommending, filtered to the ones that matter to **designers**. You get a batch of candidate videos. For each one, decide whether it belongs on DesignerTube.

## Input

A JSONL file. One video per line:

```json
{"vid": "...", "title": "...", "channel": "...", "threads": ["up to two HN thread titles it was linked under"]}
```

## Output

Write a JSONL file (path given in your instructions) with exactly one line per input video, same order:

```json
{"vid": "...", "design": "core" | "adjacent" | "no"}
```

## Rubric

**core** — the video is primarily *about* a design discipline, its craft, history, theory, tools or people:
- UX, user research, usability, information architecture, UX writing, dark patterns / design ethics
- UI and interaction design, input devices and novel interfaces, HCI research and GUI history (Engelbart, PARC, Alan Kay, Macintosh), tools for thought and Bret Victor-style interface/programming-environment design
- Service design, design thinking, design strategy and leadership, civic/government service design
- Visual and graphic design, layout, color, illustration, icons, typography, type design, lettering, logos, branding and identity, advertising design, packaging
- Design systems, web design, CSS and front-end design craft
- Product and industrial design (Dieter Rams, Braun, Apple hardware design, everyday objects, furniture), vehicle/cockpit design
- Architecture and urban design as design (buildings, public space, Christopher Alexander, wayfinding, signage, maps)
- Information design and data visualization (Tufte, explorable explanations, cartography)
- Animation principles, motion graphics, title design, cinematography and visual storytelling as craft
- Game design (mechanics, level design, game feel, game UI)
- Creative coding, generative art, shader art, computational/parametric design
- Accessibility and inclusive design
- Design tools (Figma, Sketch, Photoshop history), prototyping, design careers and creative process
- Documentaries and interviews about designers or design (e.g. *Helvetica*, *Objectified*, Abstract)

**adjacent** — not primarily about design, but clearly valuable to designers and recommended on HN for reasons a designer would care about: e.g. a famous product keynote praised for its interaction design, perception/psychology talks about how people see and decide, creativity talks (John Cleese on creativity), storytelling craft, a talk on simplicity in software that is really about user experience.

**no** — everything else: programming languages, systems, security, ML research, politics, science, comedy, music, business, gadget reviews, general history, etc. A video being visually beautiful, or about a "designed" software system, does not make it design. "Software design/architecture" talks are **no** unless they are about the human-facing interface.

When unsure between core and adjacent, pick adjacent. When unsure between adjacent and no, pick no.

## Notes

- Judge from title, channel and thread titles together. Thread titles show the context it was shared in, not necessarily the topic of the video. Use your knowledge of well-known talks, channels and people (e.g. Bret Victor, Dieter Rams, Config, NN/g, Vox's design videos).
- Most candidates are **no**: HN links a lot of programming, science and comedy. Expect only a small share to be design.
- Work through the whole file. Do not skip lines. Do not write anything except the output file.
