import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { JsonLd } from "@/components/JsonLd";
import { Shell } from "@/components/Shell";
import { websiteJsonLd } from "@/lib/seo";
import { SITE_NAME, SITE_URL, TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: design videos Hacker News keeps recommending`, template: `%s - ${SITE_NAME}` },
  description: `${TAGLINE} Over a thousand talks, lectures and documentaries on UX, interaction, typography, design systems and more, ranked by two decades of Hacker News recommendations.`,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1, "max-snippet": -1 } },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  category: "design",
};

export const viewport: Viewport = { themeColor: "#0f0f0f" };

// Applied before paint so the saved theme never flashes.
const THEME_SCRIPT = `try{var t=JSON.parse(localStorage.getItem("dt:set:theme"));if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <JsonLd data={websiteJsonLd()} />
      </head>
      <body>
        <Shell>{children}</Shell>
        {/* cookieless page-view counts; reads search params, so it needs its own Suspense boundary */}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
