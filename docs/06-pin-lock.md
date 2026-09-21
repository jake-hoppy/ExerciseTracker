# PIN lock

Phase 2. A 4-digit PIN gate over the whole app — enough to stop someone who
stumbles onto the URL, not a real authentication system. Build it exactly as
described; the details that look fussy are the ones that matter.

## Threat model, stated honestly

This defends against: someone finding the URL in a browser history, a shared
screen, or a link. That's the actual risk.

It does **not** defend against a determined attacker. Four digits is 10,000
combinations — seconds to brute-force without rate limiting, minutes with it.
That's an accepted tradeoff for bodyweight and calorie data, not an oversight.
If this ever holds something that matters more, replace it with real auth
rather than lengthening the PIN.

## Rules

1. **The PIN lives in an environment variable, never in source.** A PIN
   committed to a GitHub repo is public, and stays in git history after the
   line is deleted. `.env` is gitignored; production values go in the Vercel
   dashboard.
2. **The cookie never contains the PIN.** It holds a separate secret, so a
   leaked cookie doesn't leak the code.
3. **Rate limit the attempts.** Without it, 10,000 guesses is a trivial script.
4. **Constant-time comparison.** Cheap to do, and `===` on a secret leaks
   timing.

## Environment

```bash
# .env.local — gitignored
APP_PIN=1234                        # the 4 digits
SESSION_SECRET=<32+ random chars>   # openssl rand -hex 32
```

Both also go in Vercel → Settings → Environment Variables.

## Implementation

### `middleware.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'tt_session';
const OPEN = ['/unlock', '/api/unlock'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (OPEN.some(p => pathname.startsWith(p))) return NextResponse.next();

  if (req.cookies.get(COOKIE)?.value === process.env.SESSION_SECRET) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/unlock';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

// Everything except Next internals and static files.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)'],
};
```

### `app/api/unlock/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';

const attempts = new Map<string, { n: number; until: number }>();
const MAX = 5;
const LOCKOUT_MS = 60_000;

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
  const now = Date.now();
  const rec = attempts.get(ip);

  if (rec && rec.until > now) {
    const secs = Math.ceil((rec.until - now) / 1000);
    return NextResponse.json({ error: `Too many attempts. Try again in ${secs}s.` }, { status: 429 });
  }

  const { pin } = await req.json().catch(() => ({ pin: '' }));
  const expected = process.env.APP_PIN ?? '';

  if (!expected || typeof pin !== 'string' || !equal(pin, expected)) {
    const n = (rec && rec.until <= now ? 0 : rec?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= MAX ? now + LOCKOUT_MS : 0 });
    // Deliberately vague: don't reveal whether the PIN was close or the
    // length was wrong.
    return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
  }

  attempts.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: 'tt_session',
    value: process.env.SESSION_SECRET!,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,   // 90 days — this is a personal device
  });
  return res;
}
```

### `app/unlock/page.tsx`

A centred 4-digit entry, styled per `docs/03-design-system.md`:

- One input, `inputMode="numeric"`, `pattern="[0-9]*"`, `maxLength={4}`,
  `autoFocus`, monospace and large — this is typed one-handed
- Auto-submit on the fourth digit; no separate button needed
- On success, redirect to the `from` param (default `/`)
- On failure, shake the field, clear it, refocus. Show the server's message
  verbatim — it's already appropriately vague
- No "forgot your PIN" link. There's nowhere for it to go

## Known limits — write these down, don't discover them later

- **The rate limiter is in-memory**, so on Vercel it resets when an instance
  recycles and doesn't coordinate across instances. It raises the cost of a
  brute-force attempt without eliminating it. Upstash Redis is the fix if that
  ever matters; it does not currently.
- **A 90-day cookie means a lost phone stays logged in.** Rotate
  `SESSION_SECRET` in Vercel to invalidate every session everywhere — that's
  the panic button, and it's worth knowing it exists.
- **No logout.** Add one if a second person ever uses a device.
