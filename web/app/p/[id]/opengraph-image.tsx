import { ImageResponse } from "next/og";
import { playlists } from "@/lib/data";
import { CollectionCard, OG_SIZE, OG_TYPE, ogFonts, thumbData } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateImageMetadata({ params }: { params: { id: string } }) {
  const p = playlists().find((p) => p.id === params.id);
  return [{ id: "card", alt: p ? `${p.name}: a DesignerTube playlist` : "DesignerTube", size, contentType }];
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = playlists().find((p) => p.id === id);
  const srcs = await Promise.all((p?.vids ?? []).slice(0, 4).map((v) => thumbData(v)));
  return new ImageResponse(
    (
      <CollectionCard
        kicker={`Playlist · ${p?.vids.length ?? 0} videos`}
        title={p?.name ?? "DesignerTube"}
        subtitle={p?.description ?? ""}
        srcs={srcs}
        footer="designertube.app"
      />
    ),
    { ...size, fonts: ogFonts() },
  );
}
