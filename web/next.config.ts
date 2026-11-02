import fs from "node:fs";
import type { NextConfig } from "next";

// "3 years ago" is measured from the day the dataset was exported, so prerendered pages stay deterministic.
const DATA_DATE = (() => {
  try {
    return JSON.parse(fs.readFileSync("./data/meta.json", "utf8")).generated as string;
  } catch {
    return "2026-11-02";
  }
})();

const isDev = process.env.NODE_ENV !== "production";

// Same hardening as HackerTube: only YouTube thumbnails and the privacy-enhanced embed are allowed in.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.designertube.app").replace(/\/$/, "");
const SITE_HOST = new URL(SITE_URL).host;
const APEX = SITE_HOST.replace(/^www\./, "");
const OTHER_HOST = SITE_HOST === APEX ? `www.${APEX}` : APEX; // the www/bare variant that is not canonical

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_DATA_DATE: DATA_DATE },
  cacheComponents: true,
  partialPrefetching: true,
  // the dataset is read from disk at runtime by the API routes and pages
  outputFileTracingIncludes: { "/**": ["./data/**", "./assets/**"] },
  // One canonical host: the other www/bare variant and, on the deployment that owns SITE_URL's
  // domain, the production *.vercel.app aliases 308 to it. Previews and forks are left alone.
  async redirects() {
    const ownsDomain =
      process.env.VERCEL_ENV === "production" &&
      [APEX, `www.${APEX}`].includes(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "");
    return [
      { source: "/:path*", has: [{ type: "host" as const, value: OTHER_HOST }], destination: `${SITE_URL}/:path*`, permanent: true },
      ...(ownsDomain
        ? [{ source: "/:path*", has: [{ type: "host" as const, value: "(?<sub>.+)\\.vercel\\.app" }], destination: `${SITE_URL}/:path*`, permanent: true }]
        : []),
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
