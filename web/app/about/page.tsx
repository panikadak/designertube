import Link from "next/link";
import type { Metadata } from "next";
import { meta } from "@/lib/data";

export const metadata: Metadata = {
  title: "About",
  description: "How DesignerTube was built: every Hacker News comment linking YouTube, read and labeled by Claude, filtered to the design videos HN keeps recommending. Data is free to reuse.",
  alternates: { canonical: "/about" },
};

const mb = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

export default function About() {
  const m = meta();
  return (
    <article className="prose">
      <h1>
        Designer<span style={{ color: "var(--accent)" }}>Tube</span>
      </h1>
      <p className="muted">The YouTube videos that Hacker News keeps telling designers to watch.</p>

      <div className="stats">
        <div className="stat"><b>{m.videos.toLocaleString("en-US")}</b><span>videos</span></div>
        <div className="stat"><b>{m.mentions.toLocaleString("en-US")}</b><span>HN comments read</span></div>
        <div className="stat"><b>{m.topics}</b><span>topics in {m.areas} areas</span></div>
        <div className="stat"><b>{m.years[0]}–{m.years[1]}</b><span>years of HN</span></div>
      </div>

      <h2>Why</h2>
      <p>
        YouTube&apos;s recommendations are tuned for watch time. They&apos;re very good at finding the next thing
        you&apos;ll click, and not so good at finding the talk that changes how you design.
      </p>
      <p>
        Hacker News is not a design forum, but for almost two decades its readers, many of them people who build
        interfaces for a living, have been pointing each other at exactly those videos: the HCI demo that still
        looks like the future, the typography lecture that finally made it click, the Dieter Rams documentary, the
        game-feel talk every UI designer should see. Those recommendations are scattered across millions of
        comments. DesignerTube collects the design ones in one place and makes them browsable, searchable and
        personal.
      </p>

      <h2>How it was built</h2>
      <ol>
        <li>
          <b>Read all of Hacker News.</b> Every comment and submission from {m.years[0]} to {m.years[1]} that
          links YouTube was pulled from the public HN search API and scanned for video links.
        </li>
        <li>
          <b>Find the design videos.</b> Every video linked by at least two people in two different months is a
          candidate. Claude read each candidate&apos;s title, channel and the HN threads it was shared in, and judged
          which ones are about design: UX, interaction, service design, visual design, typography, design systems,
          industrial design, architecture, data visualization, game design and more.
        </li>
        <li>
          <b>Read each comment with an AI model.</b> A link isn&apos;t always a recommendation. Claude read every
          comment linking a design video, with the title of the thread it was posted under, and judged what the
          commenter was doing: recommending it, citing it, joking or criticizing. It also picked out a short quote.
        </li>
        <li>
          <b>Keep the ones HN keeps coming back to.</b> A video makes the cut if at least two different people
          recommended it, in at least two different months. (HackerTube uses three and three; design is a smaller
          slice of HN, so the bar is a little lower.)
        </li>
        <li>
          <b>Write a card for every video.</b> From everything HN said about it, Claude wrote a short summary, why
          HN people like it, what kind of video it is, and whether it has aged well, then filed it under the topic
          list.
        </li>
        <li>
          <b>Rank by lasting recommendations.</b> A video&apos;s standing comes from how many separate months people
          recommended it in. Being recommended again and again over the years counts for more than one viral spike.
        </li>
      </ol>

      <h2>What you can do</h2>
      <p>
        <b>Home</b> mixes HN classics, hidden gems that a few people love, recent favorites, topics you haven&apos;t
        explored yet and, once you like a few videos, things similar to them and things the same HN people also
        recommended. Hover a video to see why it&apos;s there.
      </p>
      <p>
        <b>Search</b> understands topics, not just keywords. Browse by topic on <Link href="/categories">Categories</Link>,
        or start with one of the <Link href="/playlists">Playlists</Link>. Every video page shows what Hacker News
        actually said about it, with links back to the threads.
      </p>
      <p>
        Keyboard shortcuts: press <kbd>?</kbd> to see them all, e.g. <kbd>/</kbd> to search and <kbd>j</kbd>/<kbd>k</kbd> to
        move through videos.
      </p>

      <h2>Fork it</h2>
      <p>
        Everything behind this site is yours to reuse. Give the zip to your AI agent (Claude Code or similar) and tell
        it what you want: a different interface, a weekly email of talks on your topics, an analysis. The zip includes
        a DATA.md written for agents.
      </p>
      {m.files && (
        <table>
          <tbody>
            {m.files.map((f) => (
              <tr key={f.name}>
                <td><code>{f.name}</code></td>
                <td>{f.description}</td>
                <td style={{ whiteSpace: "nowrap" }}>{mb(f.bytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {m.zip && (
        <p>
          <a href={`/data/${m.zip.name}`}>Download the data ({mb(m.zip.bytes)}) →</a> Released under ODC-By 1.0, like
          the Hacker News archive it comes from.
        </p>
      )}

      <h2>Privacy</h2>
      <p>
        There are no accounts. Your likes, history and Watch later list are stored only in this browser. Videos play
        through YouTube&apos;s privacy-enhanced embed.
      </p>

      <h2>Credits</h2>
      <p>
        Inspired by <a href="https://hackertube.org">HackerTube</a> by @karpathy, and built the same way: by Claude
        Opus 5.5 in Claude Code, with comment labels and video cards written by teams of Claude Sonnet agents. Not
        affiliated with YouTube, Google, Hacker News or Y Combinator.
      </p>
    </article>
  );
}
