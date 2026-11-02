import { ImageResponse } from "next/og";
import { meta, videos } from "@/lib/data";
import { CollectionCard, OG_SIZE, OG_TYPE, ogFonts, thumbData } from "@/lib/og";

export const alt = "DesignerTube: the YouTube videos that Hacker News keeps telling designers to watch";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function OpengraphImage() {
  const m = meta();
  const srcs = await Promise.all(videos().slice(0, 6).map((v) => thumbData(v.vid)));
  return new ImageResponse(
    (
      <CollectionCard
        kicker="Curated by Hacker News"
        title="The YouTube videos Hacker News keeps telling designers to watch"
        subtitle={`${m.videos.toLocaleString("en-US")} talks, lectures and documentaries, ranked by ${m.mentions.toLocaleString("en-US")} HN comments from ${m.years[0]}–${m.years[1]}.`}
        srcs={srcs}
        footer="designertube.app"
      />
    ),
    { ...size, fonts: ogFonts() },
  );
}
