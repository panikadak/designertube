import type { Metadata } from "next";
import { VideoCard } from "@/components/VideoCard";
import { isLong, videos } from "@/lib/data";

export const metadata: Metadata = {
  title: "Longs: long-form design lectures and documentaries",
  description: "The opposite of Shorts: design lectures, courses, documentaries and long conversations that Hacker News recommends.",
  alternates: { canonical: "/longs" },
};

export default function Longs() {
  const list = videos().filter(isLong);
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 4 }}>Longs</h1>
      <p className="muted" style={{ margin: "0 0 24px" }}>
        The opposite of Shorts: lectures, courses, documentaries and long conversations worth a whole evening.
      </p>
      <div className="grid">
        {list.map((v) => (
          <VideoCard key={v.vid} v={v} />
        ))}
      </div>
    </>
  );
}
