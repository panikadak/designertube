import json
from pathlib import Path

ROOT = Path(__file__).parent
DATA = ROOT / "data"
LLM = DATA / "llm"


def jsonl(path):
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def around(text, vid, before=220, after=110):
    """The part of a comment around the link to `vid`."""
    i = text.find(vid)
    if i < 0:
        return text[: before + after]
    return text[max(0, i - before): i + after]


def write_batches(stage, rows, size):
    d = LLM / stage
    d.mkdir(parents=True, exist_ok=True)
    for old in d.glob("in_*.jsonl"):
        old.unlink()
    n = 0
    for i in range(0, len(rows), size):
        write_jsonl(d / f"in_{n:03d}.jsonl", rows[i: i + size])
        n += 1
    return n


def read_outputs(stage):
    """All rows from data/llm/<stage>/out_*.jsonl, tolerant of a malformed line."""
    rows = []
    for p in sorted((LLM / stage).glob("out_*.jsonl")):
        for line in open(p):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return rows
