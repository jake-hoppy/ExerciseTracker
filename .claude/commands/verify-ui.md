---
description: Screenshot a route, review it against the design system, fix, repeat until it holds up.
---

Run the visual verification loop on: $ARGUMENTS

(If no route was given, use the one just changed.)

## The loop

**1. Render it.** Make sure the dev server is running, then capture the route
with Playwright at two widths — 1280px and 390px:

```js
// scripts/shot.mjs
import { chromium } from 'playwright';
const [route = '/', name = 'shot'] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [label, width] of [['desktop', 1280], ['mobile', 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `.shots/${name}-${label}.png`, fullPage: true });
  await page.close();
}
await browser.close();
```

Seed realistic data first. A screen reviewed with empty state tells you
nothing about the screen people will actually see.

**2. Look at it yourself.** Read both screenshots before delegating. Obvious
breakage is faster to catch directly than to route through a subagent.

**3. Get an independent review.** Launch the `ui-reviewer` subagent with both
screenshot paths, the route, and what changed. It hasn't seen the code, which
is the point — work that grades itself grades gently.

**4. Fix the findings**, worst first.

**5. Repeat from step 1.**

## When to stop

Stop when the reviewer's top finding is cosmetic and minor. Two clean passes
in a row means you are polishing, not fixing — stop then too.

Hard cap: **four iterations.** If it isn't right by then, the problem is the
design, not the implementation. Stop and raise it rather than looping.

## Don't

- Don't call a screen done without having seen it rendered at 390px.
- Don't fix findings you disagree with. Say why instead — the reviewer is
  sometimes wrong, and silently complying with a bad note makes the screen
  worse.
- Don't screenshot after every tiny edit. Batch related changes into one pass.
