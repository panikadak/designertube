import { ImageResponse } from "next/og";
import { meta } from "@/lib/data";
import { TAGLINE } from "@/lib/site";

export const alt = "DesignerTube: the YouTube videos that Hacker News keeps telling designers to watch";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const m = meta();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0f0f0f",
          color: "#f1f1f1",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 22,
              background: "#ff6600",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 66,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>
            Designer<span style={{ color: "#ff6600" }}>Tube</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 52, lineHeight: 1.2, maxWidth: 1000 }}>{TAGLINE}</div>
        <div style={{ display: "flex", gap: 48, fontSize: 30, color: "#aaaaaa" }}>
          <span>{m.videos.toLocaleString("en-US")} videos</span>
          <span>{m.mentions.toLocaleString("en-US")} HN comments read</span>
          <span>
            {m.years[0]}–{m.years[1]}
          </span>
        </div>
      </div>
    ),
    size,
  );
}
