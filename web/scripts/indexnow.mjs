// Tell IndexNow search engines (Bing, Yandex, Seznam, Naver…) about every URL in the sitemap.
// Run after a production deploy:  node scripts/indexnow.mjs
// The key is public by design: IndexNow verifies ownership by fetching /{key}.txt from the site.
import fs from "node:fs";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.designertube.app").replace(/\/$/, "");
const keyFile = fs.readdirSync(new URL("../public/", import.meta.url)).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("no IndexNow key file in public/");
const key = keyFile.slice(0, -4);

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
for (let i = 0; i < urls.length; i += 10000) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${keyFile}`, urlList: urls.slice(i, i + 10000) }),
  });
  console.log(`submitted ${Math.min(urls.length, i + 10000)}/${urls.length} URLs: HTTP ${res.status}`);
}
