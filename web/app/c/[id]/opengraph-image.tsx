import { ImageResponse } from "next/og";
import { inArea, inTopic, taxonomy, topic, videos, yearsBeforeLatest } from "@/lib/data";
import { CollectionCard, OG_SIZE, OG_TYPE, ogFonts, thumbData } from "@/lib/og";
import type { Video } from "@/lib/types";

export const size = OG_SIZE;
export const contentType = OG_TYPE;

const SPECIAL: Record<string, [string, () => Video[]]> = {
  all: ["All videos", () => videos()],
  recent: ["Recently recommended", () => videos().filter((v) => yearsBeforeLatest(v.hn.last_rec) <= 2)],
  gems: ["Hidden gems", () => videos().filter((v) => v.hn.recommenders <= 3 && v.hn.strong >= 1)],
};

function resolve(id: string): { name: string; kicker: string; list: Video[] } | undefined {
  if (SPECIAL[id]) return { name: SPECIAL[id][0], kicker: "Collection", list: SPECIAL[id][1]() };
  const area = taxonomy().find((a) => a.id === id);
  if (area) return { name: area.name, kicker: "Design area", list: inArea(id) };
  const t = topic(id);
  if (t) return { name: t.name, kicker: t.area.name, list: inTopic(id) };
}

export function generateImageMetadata({ params }: { params: { id: string } }) {
  const c = resolve(params.id);
  return [{ id: "card", alt: c ? `${c.name}: design videos recommended on Hacker News` : "DesignerTube", size, contentType }];
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const c = resolve((await params).id);
  const list = c?.list ?? videos();
  const srcs = await Promise.all(list.slice(0, 4).map((v) => thumbData(v.vid)));
  const n = list.length;
  return new ImageResponse(
    (
      <CollectionCard
        kicker={c?.kicker ?? "DesignerTube"}
        title={c?.name ?? "DesignerTube"}
        subtitle={`${n} video${n === 1 ? "" : "s"} Hacker News keeps recommending to designers.`}
        srcs={srcs}
        footer="designertube.app"
      />
    ),
    { ...size, fonts: ogFonts() },
  );
}
