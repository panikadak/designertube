import { notFound, permanentRedirect } from "next/navigation";
import { canonical, video, videos } from "@/lib/data";
import { videoPath } from "@/lib/site";

// /watch/{id} (and merged duplicate uploads) permanently redirect to the slugged permalink.
export function generateStaticParams() {
  return videos().flatMap((v) => [v.vid, ...(v.aliases ?? [])]).map((vid) => ({ vid }));
}

// Every real path is prerendered; awaiting params outside Suspense lets unknown paths answer
// with a real 404/308 status instead of a streamed 200.
export const instant = false;

export default async function WatchRedirect(props: PageProps<"/watch/[vid]">) {
  const { vid } = await props.params;
  const v = video(vid) ?? video(canonical(vid) ?? "");
  if (!v) notFound();
  permanentRedirect(videoPath(v));
}
