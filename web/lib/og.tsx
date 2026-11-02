// Shared pieces for the generated Open Graph images (1200x630, rendered by next/og at build time).
import fs from "node:fs";
import path from "node:path";
import { cacheLife } from "next/cache";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

export const C = {
  bg: "#0f0f0f",
  card: "#1c1c1c",
  text: "#f1f1f1",
  muted: "#a3a3a3",
  dim: "#6f6f6f",
  accent: "#ff6600",
  accentText: "#ff8a3d",
};

type Font = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" | "italic" };
let _fonts: Font[] | undefined;

/** Inter (OFL), latin + latin-ext, vendored in assets/fonts. */
export function ogFonts(): Font[] {
  if (_fonts) return _fonts;
  const dir = path.join(process.cwd(), "assets", "fonts");
  const fonts: Font[] = [];
  for (const subset of ["latin", "latin-ext"]) {
    for (const [w, style] of [["400", "normal"], ["400", "italic"], ["700", "normal"], ["800", "normal"]] as const) {
      const b = fs.readFileSync(path.join(dir, `inter-${subset}-${w}-${style}.woff`));
      fonts.push({ name: "Inter", data: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, weight: Number(w) as 400 | 700 | 800, style });
    }
  }
  return (_fonts = fonts);
}

/** YouTube's mid-video frame as a data URL; cached so each thumbnail is fetched once. */
export async function thumbData(vid: string): Promise<string | null> {
  "use cache";
  cacheLife("max");
  try {
    const r = await fetch(`https://i.ytimg.com/vi/${vid}/hq2.jpg`);
    if (!r.ok) return null;
    return `data:image/jpeg;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Drop characters the vendored fonts cannot draw (CJK, emoji, box drawing) and tidy the gaps. */
export function ogText(s: string, max = 0): string {
  const kept = s
    .replace(/[^\u0000-ɏ‐-‧‰-⁞₠-₿™←-↓−≠]/g, " ")
    .replace(/[|│]+/g, " · ")
    .replace(/\s*·\s*(·\s*)+/g, " · ")
    .replace(/\s+/g, " ")
    .replace(/^[\s·:-]+|[\s·:-]+$/g, "");
  if (!max || kept.length <= max) return kept;
  const cut = kept.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 12)).replace(/[\s,.;:-]+$/, "")}…`;
}

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.32 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          background: C.accent,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.68,
          fontWeight: 800,
        }}
      >
        D
      </div>
      <div style={{ display: "flex", fontSize: size * 0.72, fontWeight: 800, letterSpacing: -size * 0.02 }}>
        <span style={{ color: C.text }}>Designer</span>
        <span style={{ color: C.accent }}>Tube</span>
      </div>
    </div>
  );
}

export function PlayButton({ w = 78 }: { w?: number }) {
  return (
    <div
      style={{
        width: w,
        height: w * 0.7,
        borderRadius: w * 0.2,
        background: C.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      <svg width={w * 0.42} height={w * 0.42} viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" fill="white" />
      </svg>
    </div>
  );
}

/** A 16:9 thumbnail tile; `src` is a data URL or null (renders a plain tile). */
export function Thumb({ src, width, radius = 14 }: { src: string | null; width: number; radius?: number }) {
  const height = Math.round((width * 9) / 16);
  return (
    <div style={{ display: "flex", width, height, borderRadius: radius, overflow: "hidden", background: C.card }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width={width} height={height} style={{ width, height, objectFit: "cover" }} alt="" />
      )}
    </div>
  );
}

/** Grid of thumbnails used on the site, topic and playlist cards. */
export function Mosaic({ srcs, cols, tile, gap = 14 }: { srcs: (string | null)[]; cols: number; tile: number; gap?: number }) {
  const rows: (string | null)[][] = [];
  for (let i = 0; i < srcs.length; i += cols) rows.push(srcs.slice(i, i + cols));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap }}>
          {r.map((s, j) => (
            <Thumb key={j} src={s} width={tile} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Two-column card: copy on the left, a thumbnail mosaic on the right, brand row at the bottom. */
export function CollectionCard({
  kicker,
  title,
  subtitle,
  srcs,
  footer,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  srcs: (string | null)[];
  footer: string;
}) {
  const t = ogText(title, 70);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: C.bg,
        color: C.text,
        fontFamily: "Inter",
        padding: 56,
        gap: 48,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 520, justifyContent: "space-between" }}>
        <Logo size={40} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.accentText, textTransform: "uppercase", letterSpacing: 2 }}>{kicker}</div>
          <div style={{ fontSize: t.length > 40 ? 50 : 62, fontWeight: 800, lineHeight: 1.06, letterSpacing: -1.5 }}>{t}</div>
          <div style={{ fontSize: 26, color: C.muted, lineHeight: 1.35 }}>{ogText(subtitle, 150)}</div>
        </div>
        <div style={{ fontSize: 22, color: C.dim }}>{footer}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Mosaic srcs={srcs} cols={2} tile={252} />
      </div>
    </div>
  );
}
