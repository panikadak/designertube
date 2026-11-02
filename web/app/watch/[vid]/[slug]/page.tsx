import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { VideoCard } from "@/components/VideoCard";
import { Actions, Comments, Player } from "@/components/Watch";
import { canonical, mentions, video, videos } from "@/lib/data";
import { related } from "@/lib/feed";
import { compact, ago } from "@/lib/format";
import { breadcrumbJsonLd, clip, pageMeta, videoCrumbs, videoJsonLd } from "@/lib/seo";
import { slugify, videoPath, ytEmbed } from "@/lib/site";

export function generateStaticParams() {
  return videos().map((v) => ({ vid: v.vid, slug: slugify(v.title) }));
}

export async function generateMetadata(props: PageProps<"/watch/[vid]/[slug]">): Promise<Metadata> {
  const v = video((await props.params).vid);
  if (!v) return {};
  const r = v.hn.recommenders;
  const description = clip(`${v.summary.split(/(?<=[.!?])\s/)[0]} Recommended by ${r} Hacker News commenter${r === 1 ? "" : "s"}.`, 200);
  return {
    ...pageMeta({
      path: videoPath(v),
      title: v.title,
      description,
      type: "video.other",
      extra: { videos: [{ url: ytEmbed(v.vid), secureUrl: ytEmbed(v.vid), type: "text/html", width: 1280, height: 720 }] },
    }),
    keywords: [...v.tags, ...v.categories.map((c) => c.name)],
  };
}

const STANCE_ORDER: Record<string, number> = { strong: 0, rec: 1, reference: 2, critique: 3, joke: 4, bare: 5 };

// Every real path is prerendered; awaiting params outside Suspense lets unknown paths answer
// with a real 404/308 status instead of a streamed 200.
export const instant = false;

export default async function WatchPage(props: PageProps<"/watch/[vid]/[slug]">) {
  const { vid, slug } = await props.params;
  const v = video(vid);
  if (!v) {
    const c = canonical(vid);
    const target = c ? video(c) : undefined;
    if (target) permanentRedirect(videoPath(target));
    notFound();
  }
  if (slug !== slugify(v.title)) permanentRedirect(videoPath(v));

  const ms = mentions(vid)
    .slice()
    .sort((a, b) => (STANCE_ORDER[a.stance] ?? 9) - (STANCE_ORDER[b.stance] ?? 9) || b.month.localeCompare(a.month));
  const next = related(v, 20);
  const r = v.hn.recommenders;
  const span = v.hn.first === v.hn.last ? v.hn.first : `${v.hn.first}–${v.hn.last}`;
  const crumbs = videoCrumbs(v);
  const facts = [
    v.views ? `${compact(v.views)} views` : null,
    v.published ? ago(v.published) : null,
    v.content_type,
    v.level !== "general" ? v.level : null,
    v.shelf_life,
  ].filter(Boolean);

  return (
    <div className="watch">
      <JsonLd data={videoJsonLd(v, ms)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <article>
        <Player key={v.vid} vid={v.vid} title={v.title} />
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.slice(1, -1).map((c, i) => (
            <span key={c.path}>
              {i > 0 && " › "}
              <Link href={c.path}>{c.name}</Link>
            </span>
          ))}
        </nav>
        <h1>{v.title}</h1>
        <div className="byline">
          <div>
            <div className="channel">{v.channel}</div>
            <div className="meta">
              {r} HN recommender{r === 1 ? "" : "s"} · recommended in {v.hn.rec_months} month
              {v.hn.rec_months === 1 ? "" : "s"}, {span}
            </div>
          </div>
          <Actions vid={v.vid} />
        </div>
        <div className="info">
          <div className="facts">{facts.join(" · ")}</div>
          <p>{v.summary}</p>
          <p className="why">{v.why_hn}</p>
          {v.quote?.text && <blockquote className="quote-block">“{v.quote.text}”</blockquote>}
          <div className="tags">
            {v.categories.map((c) => (
              <Link key={c.id} href={`/c/${c.id}`} className="chip">
                {c.name}
              </Link>
            ))}
          </div>
          <div className="tags" style={{ marginTop: 10 }}>
            {v.tags.map((t) => (
              <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="tag-link" rel="nofollow">
                #{t.replace(/\s+/g, "")}
              </Link>
            ))}
          </div>
        </div>
        <Comments mentions={ms} vids={[v.vid, ...(v.aliases ?? [])]} />
      </article>
      <aside className="upnext" aria-label="Up next">
        <h2 className="visually-hidden">Up next</h2>
        {next.map((n) => (
          <VideoCard key={n.vid} v={n} layout="mini" />
        ))}
      </aside>
    </div>
  );
}
