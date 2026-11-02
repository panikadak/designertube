import type { Metadata } from "next";
import { MyList } from "@/components/MyList";

export const metadata: Metadata = { title: "Watch later", robots: { index: false, follow: true } };

export default function Page() {
  return <MyList kind="later" />;
}
