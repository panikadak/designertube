import Link from "next/link";
import type { Metadata } from "next";
import { taxonomy } from "@/lib/data";

export const metadata: Metadata = {
  title: "Design video categories",
  description: "Browse design videos Hacker News recommends by topic: UX and research, interaction design, typography, design systems, service design, industrial design, data visualization, game design and more.",
  alternates: { canonical: "/categories" },
};

export default function Categories() {
  const areas = taxonomy().filter((a) => a.count > 0).sort((a, b) => b.count - a.count);
  return (
    <>
      <h1 className="page-title">Categories</h1>
      <div className="chips">
        <Link className="chip" href="/c/recent">Recently recommended</Link>
        <Link className="chip" href="/longs">Longs</Link>
        <Link className="chip" href="/c/gems">Hidden gems</Link>
        <Link className="chip" href="/c/all">All videos</Link>
      </div>
      {areas.map((a) => (
        <section key={a.id} className="area">
          <h2>
            <Link href={`/c/${a.id}`}>{a.name}</Link> <small>{a.count}</small>
          </h2>
          <div className="topic-grid">
            {a.topics
              .filter((t) => t.count > 0)
              .sort((x, y) => y.count - x.count)
              .map((t) => (
                <Link key={t.id} href={`/c/${t.id}`} className="topic" title={t.description}>
                  <span>{t.name}</span>
                  <span>{t.count}</span>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
