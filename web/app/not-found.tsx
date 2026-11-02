import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <div className="empty" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="page-title">This page isn&apos;t here</h1>
      <p>The video may have been removed from YouTube, or the link is mistyped.</p>
      <p style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
        <Link className="pill" href="/">Home</Link>
        <Link className="pill" href="/categories">Categories</Link>
        <Link className="pill" href="/playlists">Playlists</Link>
      </p>
    </div>
  );
}
