import type { Metadata } from "next";
import { MyList } from "@/components/MyList";

export const metadata: Metadata = { title: "History", robots: { index: false, follow: true } };

export default function Page() {
  return <MyList kind="history" />;
}
