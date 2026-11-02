import { Feed } from "@/components/Feed";
import { taxonomy, videos } from "@/lib/data";
import { buildFeed } from "@/lib/feed";

// The first page is rendered on the server with a fixed seed, so crawlers and first paint get real
// content; returning visitors with likes or history get a personalized feed once the page loads.
const SEED = 20261102;

export default function Home() {
  const areas = taxonomy()
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((a) => ({ id: a.id, name: a.name }));
  const counts = new Map<string, number>();
  for (const v of videos()) counts.set(v.content_type, (counts.get(v.content_type) ?? 0) + 1);
  const types = [...counts].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const initial = buildFeed({ like: [], dislike: [], seen: [], seed: SEED }).slice(0, 36);
  return (
    <>
      <h1 className="visually-hidden">DesignerTube: the YouTube videos Hacker News keeps telling designers to watch</h1>
      <Feed options={{ areas, types }} initial={initial} initialSeed={SEED} />
    </>
  );
}
