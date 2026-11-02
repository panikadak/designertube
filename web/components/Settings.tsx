"use client";

import { useRef } from "react";
import { useToast } from "@/components/Shell";
import { getList, setList, useList, useSetting, type ListKey } from "@/lib/store";

const KEYS: ListKey[] = ["liked", "disliked", "later", "history"];

export function Settings() {
  const [theme, setTheme] = useSetting<"dark" | "light">("theme", "dark");
  const liked = useList("liked");
  const history = useList("history");
  const later = useList("later");
  const disliked = useList("disliked");
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);

  const exportState = () => {
    const data = Object.fromEntries(KEYS.map((k) => [k, getList(k)]));
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "designertube-state.json" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const importState = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      for (const k of KEYS) if (Array.isArray(data[k])) setList(k, data[k].filter((x: unknown) => typeof x === "string"));
      toast("Imported");
    } catch {
      toast("That file doesn't look like a DesignerTube export");
    }
  };

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <div className="settings">
        <div className="setting">
          <div>
            <b>Theme</b>
            <p>Press t anywhere to toggle.</p>
          </div>
          <div className="chips" style={{ margin: 0 }}>
            {(["dark", "light"] as const).map((t) => (
              <button key={t} className={`chip${theme === t ? " active" : ""}`} onClick={() => setTheme(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="setting">
          <div>
            <b>Your data</b>
            <p>
              {liked.length} liked · {disliked.length} disliked · {later.length} watch later · {history.length} in history.
              Stored only in this browser.
            </p>
          </div>
        </div>
        <div className="setting">
          <div>
            <b>Move to another browser</b>
            <p>Export your likes, history and lists as a file, then import it elsewhere.</p>
          </div>
          <div className="actions">
            <button className="pill" onClick={exportState}>Export</button>
            <button className="pill" onClick={() => file.current?.click()}>Import</button>
            <input
              ref={file}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => e.target.files?.[0] && importState(e.target.files[0])}
            />
          </div>
        </div>
        <div className="setting">
          <div>
            <b>Reset recommendations</b>
            <p>Clears likes, dislikes and history. Watch later is kept.</p>
          </div>
          <button
            className="pill danger"
            onClick={() => {
              if (!confirm("Clear likes, dislikes and history?")) return;
              setList("liked", []);
              setList("disliked", []);
              setList("history", []);
              toast("Cleared");
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
}
