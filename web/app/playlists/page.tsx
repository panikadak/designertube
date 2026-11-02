import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Thumb } from "@/components/VideoCard";
import { byId, playlists } from "@/lib/data";

export const metadata: Metadata = pageMeta({
  path: "/playlists",
  title: "Design video playlists",
  description: "Curated viewing sequences of the design talks Hacker News recommends: start here, the history of the GUI, tools for thought, typography, data visualization, dark patterns and more.",
});

export default function Playlists() {
  const map = byId();
  return (
    <>
      <h1 className="page-title">Playlists</h1>
      <div className="grid">
        {playlists().map((p) => {
          const first = map.get(p.vids[0]);
          return (
            <Link key={p.id} href={`/p/${p.id}`} className="card">
              {first && <Thumb v={first} />}
              <div className="card-body">
                <h3 className="card-title">{p.name}</h3>
                <div className="meta">{p.vids.length} videos</div>
                <div className="meta" style={{ fontSize: 13 }}>{p.description}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
