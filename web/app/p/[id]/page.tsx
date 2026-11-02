import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { VideoCard } from "@/components/VideoCard";
import { breadcrumbJsonLd, clip, itemListJsonLd, pageMeta } from "@/lib/seo";
import { byId, playlists } from "@/lib/data";
import type { Video } from "@/lib/types";

export function generateStaticParams() {
  const ids = playlists().map((p) => ({ id: p.id }));
  return ids.length ? ids : [{ id: "none" }]; // Cache Components needs at least one
}

export async function generateMetadata(props: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const p = playlists().find((p) => p.id === id);
  if (!p) return {};
  const title = `${p.name}: a DesignerTube playlist`;
  const description = clip(`${p.description} ${p.vids.length} videos, in viewing order.`);
  return pageMeta({ path: `/p/${id}`, title, description });
}

// Every real path is prerendered; awaiting params outside Suspense lets unknown paths answer
// with a real 404/308 status instead of a streamed 200.
export const instant = false;

export default async function PlaylistPage(props: PageProps<"/p/[id]">) {
  const { id } = await props.params;
  const p = playlists().find((p) => p.id === id);
  if (!p) notFound();
  const map = byId();
  const list = p.vids.map((v) => map.get(v)).filter(Boolean) as Video[];
  const path = `/p/${id}`;
  return (
    <>
      <JsonLd data={itemListJsonLd(p.name, path, list, true)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Playlists", path: "/playlists" },
          { name: p.name, path },
        ])}
      />
      <nav className="crumbs" aria-label="Breadcrumb" style={{ marginBottom: 12 }}>
        <Link href="/playlists">Playlists</Link>
      </nav>
      <h1 className="page-title" style={{ marginBottom: 4 }}>{p.name}</h1>
      <p className="muted" style={{ margin: "0 0 24px", maxWidth: 820 }}>
        {list.length} videos · {p.description}
      </p>
      <div className="rows">
        {list.map((v) => (
          <VideoCard key={v.vid} v={v} layout="row" />
        ))}
      </div>
    </>
  );
}
