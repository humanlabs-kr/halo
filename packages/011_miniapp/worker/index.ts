import puppeteer from "@cloudflare/puppeteer";

const BOT_UA = [
  /Googlebot/i,
  /Google-InspectionTool/i,
  /Bingbot/i,
  /DuckDuckBot/i,
  /facebookexternalhit/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /WhatsApp/i,
];
export default {
  async fetch(req: Request, env, ctx: ExecutionContext) {
    const url = new URL(req.url);
    const ua = req.headers.get("user-agent") || "";
    const acceptsHtml = (req.headers.get("accept") || "").includes("text/html");
    const isBot = acceptsHtml && BOT_UA.some((re) => re.test(ua));
    if (isBot) {
      const cache = caches.default;
      const cacheKey = new Request(req.url, {
        headers: { Accept: "text/html" },
      });
      let res = await cache.match(cacheKey);

      if (!res) {
        const browser = await puppeteer.launch(env.BROWSER);
        const page = await browser.newPage();
        console.log(`${env.VITE_MINIAPP_URL}${url.pathname}${url.search}`);
        await page.goto(`${env.VITE_MINIAPP_URL}${url.pathname}${url.search}`, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        const html = await page.content();
        await browser.close();

        res = new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control":
              "public, max-age=900, stale-while-revalidate=86400",
            "x-served-by": "cf-browser-rendering",
          },
        });
        ctx.waitUntil(cache.put(cacheKey, res.clone()));
      }

      return res;
    }

    return fetch(`${env.VITE_MINIAPP_URL}${url.pathname}${url.search}`, req);
  },
} satisfies ExportedHandler<Env>;
