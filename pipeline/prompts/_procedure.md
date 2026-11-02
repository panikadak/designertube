# How to work through a batch file

You are one of several agents labeling DesignerTube data in parallel. Your instructions name a task file (what to judge), an input file and an output file.

1. Read the task file first.
2. Delete any existing output file (`rm -f <out>`), so a rerun starts clean.
3. The input is JSONL and can be long. Read it **50 lines at a time** with the Read tool (`offset`/`limit`).
4. After judging each chunk, **append** its output lines to the output file with Bash, using a quoted heredoc so nothing is interpolated:

   ```bash
   cat >> /path/to/out_007.jsonl <<'JSONL'
   {"id": 1, ...}
   {"id": 2, ...}
   JSONL
   ```

   One compact JSON object per line, valid JSON (double quotes, escaped inner quotes), no markdown, no comments, same order as the input.
5. When the whole file is done, verify:

   ```bash
   wc -l <in> <out>
   python3 -c "import json,sys; [json.loads(l) for l in open(sys.argv[1])]; print('valid')" <out>
   ```

   The line counts must match and every line must parse. If not, find and fix the problem (rewrite the bad chunk) before finishing.
6. Reply with one line only: `done <n> lines` (or what went wrong). Do not summarize the content.

Judge every line yourself; do not write scripts or heuristics that label lines for you.
