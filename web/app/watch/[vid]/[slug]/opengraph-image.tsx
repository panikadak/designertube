import { ImageResponse } from "next/og";
import { video } from "@/lib/data";
import { compact, duration } from "@/lib/format";
import { C, Logo, OG_SIZE, OG_TYPE, PlayButton, ogFonts, ogText, thumbData } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_TYPE;

type P = { vid: string; slug: string };

export function generateImageMetadata({ params }: { params: P }) {
  const v = video(params.vid);
  return [{ id: "card", alt: v ? `${v.title}: recommended on Hacker News` : "DesignerTube", size, contentType }];
}

export default async function Image({ params }: { params: Promise<P> }) {
  const v = video((await params).vid);
  if (!v) return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: C.bg }} />, size);

  const src = await thumbData(v.vid);
  const title = ogText(v.title, 96);
  const channel = ogText(v.channel, 40);
  const quote = v.quote?.text ? ogText(v.quote.text, 120) : "";
  const r = v.hn.recommenders;
  const span = v.hn.first === v.hn.last ? v.hn.first : `${v.hn.first}–${v.hn.last}`;
  const stats = [
    `${r} HN recommender${r === 1 ? "" : "s"}`,
    `${v.hn.rec_months} month${v.hn.rec_months === 1 ? "" : "s"}, ${span}`,
    v.views ? `${compact(v.views)} views` : null,
  ].filter(Boolean) as string[];
  const titleSize = title.length < 34 ? 54 : title.length < 60 ? 46 : 38;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          color: C.text,
          fontFamily: "Inter",
          padding: "52px 56px 44px",
        }}
      >
        <div style={{ display: "flex", gap: 44 }}>
          <div style={{ display: "flex", position: "relative", width: 560, height: 315, borderRadius: 22, overflow: "hidden", background: C.card }}>
            {src && (
              <img src={src} width={560} height={315} style={{ width: 560, height: 315, objectFit: "cover" }} alt="" />
            )}
            <div style={{ position: "absolute", left: 241, top: 130, display: "flex" }}>
              <PlayButton w={78} />
            </div>
            {v.duration_s ? (
              <div
                style={{
                  position: "absolute",
                  right: 14,
                  bottom: 14,
                  display: "flex",
                  background: "rgba(0,0,0,0.82)",
                  color: "white",
                  fontSize: 22,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 8,
                }}
              >
                {duration(v.duration_s)}
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.accentText, textTransform: "uppercase", letterSpacing: 1.5 }}>
              {ogText(v.categories[0]?.name ?? "Design", 34)}
            </div>
            <div style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.2 }}>{title}</div>
            {channel && <div style={{ fontSize: 26, color: C.muted }}>{channel}</div>}
          </div>
        </div>

        {quote ? (
          <div style={{ display: "flex", marginTop: 34, borderLeft: `5px solid ${C.accent}`, paddingLeft: 22 }}>
            <div style={{ display: "flex", fontSize: 28, fontStyle: "italic", color: "#e6e6e6", lineHeight: 1.35 }}>{`“${quote}”`}</div>
          </div>
        ) : null}

        <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 23, color: C.muted }}>
            <div
              style={{
                width: 30,
                height: 30,
                background: C.accent,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 800,
                borderRadius: 4,
              }}
            >
              Y
            </div>
            {stats.join("  ·  ")}
          </div>
          <Logo size={34} />
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
