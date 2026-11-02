import { Suspense } from "react";
import type { Metadata } from "next";
import { VideoCard } from "@/components/VideoCard";
import { search } from "@/lib/search";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const q = String((await searchParams).q ?? "").trim();
  if (!q) return <div className="empty">Search for a topic, a designer, a talk…</div>;
  const results = search(q);
  return (
    <>
      <div className="muted" style={{ marginBottom: 16 }}>
        {results.length ? `${results.length} results for “${q}”` : `No results for “${q}”`}
      </div>
      <div className="rows">
        {results.map((v) => (
          <VideoCard key={v.vid} v={v} layout="row" />
        ))}
      </div>
    </>
  );
}

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <Suspense fallback={<div className="spinner" />}>
      <Results searchParams={props.searchParams} />
    </Suspense>
  );
}
