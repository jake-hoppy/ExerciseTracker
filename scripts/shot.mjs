// Screenshots a route at desktop and phone widths for /verify-ui.
// Usage: node scripts/shot.mjs [route] [name]
// Behind the PIN gate it sends the session cookie from .env.local, so the
// route renders instead of redirecting to /unlock. Pass --locked to skip that.
import { chromium } from "playwright";
import { config } from "dotenv";

config({ path: ".env.local" });

const args = process.argv.slice(2).filter((a) => a !== "--locked");
const locked = process.argv.includes("--locked");
const [route = "/", name = "shot"] = args;
const browser = await chromium.launch();
for (const [label, width] of [["desktop", 1280], ["mobile", 390]]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  if (!locked && process.env.SESSION_SECRET) {
    await context.addCookies([
      { name: "tt_session", value: process.env.SESSION_SECRET, domain: "localhost", path: "/" },
    ]);
  }
  const page = await context.newPage();
  await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `.shots/${name}-${label}.png`, fullPage: true });
  await context.close();
}
await browser.close();
