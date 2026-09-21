// Screenshots a route at desktop and phone widths for /verify-ui.
// Usage: node scripts/shot.mjs [route] [name]
import { chromium } from "playwright";

const [route = "/", name = "shot"] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [label, width] of [["desktop", 1280], ["mobile", 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `.shots/${name}-${label}.png`, fullPage: true });
  await page.close();
}
await browser.close();
