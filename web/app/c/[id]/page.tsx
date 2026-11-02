import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { VideoCard } from "@/components/VideoCard";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";
import { inArea, inTopic, taxonomy, topic, videos, yearsBeforeLatest as yearsAgo } from "@/lib/data";
import type { Video } from "@/lib/types";

const SPECIAL: Record<string, { name: string; description: string; list: () => Video[] }> = {
  all: { name: "All videos", description: "Every video, best first.", list: () => videos() },
  recent: {
    name: "Recently recommended",
    description: "Videos HN people recommended in the last two years.",
    list: () =>
      videos()
        .filter((v) => yearsAgo(v.hn.last_rec) <= 2)
        .sort((a, b) => b.hn.last_rec.localeCompare(a.hn.last_rec)),
  },
  gems: {
    name: "Hidden gems",
    description: "Few recommenders, every one of them enthusiastic.",
    list: () => videos().filter((v) => v.hn.recommenders <= 3 && v.hn.strong >= 1),
  },
};

type Resolved = { name: string; description: string; list: () => Video[]; parent?: { name: string; id: string } };

function resolve(id: string): Resolved | undefined {
  if (SPECIAL[id]) return SPECIAL[id];
  const area = taxonomy().find((a) => a.id === id);
  if (area) return { name: area.name, description: area.topics.map((t) => t.name).join(" · "), list: () => inArea(id) };
  const t = topic(id);
  if (t) return { name: t.name, description: t.description, list: () => inTopic(id), parent: { name: t.area.name, id: t.area.id } };
  return undefined;
}

function crumbs(id: string, c: Resolved) {
  return [
    { name: "Home", path: "/" },
    { name: "Categories", path: "/categories" },
    ...(c.parent ? [{ name: c.parent.name, path: `/c/${c.parent.id}` }] : []),
    { name: c.name, path: `/c/${id}` },
  ];
}

export function generateStaticParams() {
  return [
    ...Object.keys(SPECIAL),
    ...taxonomy().flatMap((a) => [a.id, ...a.topics.map((t) => t.id)]),
  ].map((id) => ({ id }));
}

export async function generateMetadata(props: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const c = resolve(id);
  if (!c) return {};
  const list = c.list();
  const title = SPECIAL[id] ? `${c.name}: design videos Hacker News recommends` : `${c.name} videos and talks recommended on Hacker News`;
  const top = list.slice(0, 3).map((v) => `“${v.title}”`).join(", ");
  const description = `${list.length} ${c.name.toLowerCase()} videos that Hacker News keeps recommending to designers${top ? `, including ${top}` : ""}.`;
  return {
    title,
    description: description.length > 300 ? description.slice(0, 297).replace(/\s+\S*$/, "") + "…" : description,
    alternates: { canonical: `/c/${id}` },
    openGraph: { url: `/c/${id}`, title, description },
    robots: list.length ? undefined : { index: false, follow: true },
  };
}

// Every real path is prerendered; awaiting params outside Suspense lets unknown paths answer
// with a real 404/308 status instead of a streamed 200.
export const instant = false;

export default async function CategoryPage(props: PageProps<"/c/[id]">) {
  const { id } = await props.params;
  const c = resolve(id);
  if (!c) notFound();
  const list = c.list();
  return (
    <>
      <JsonLd data={itemListJsonLd(c.name, `/c/${id}`, list)} />
      <JsonLd data={breadcrumbJsonLd(crumbs(id, c))} />
      <h1 className="page-title" style={{ marginBottom: 4 }}>{c.name}</h1>
      <p className="muted" style={{ margin: "0 0 24px", maxWidth: 820 }}>
        {list.length} videos · {c.description}
      </p>
      <div className="grid">
        {list.map((v) => (
          <VideoCard key={v.vid} v={v} />
        ))}
      </div>
    </>
  );
}
