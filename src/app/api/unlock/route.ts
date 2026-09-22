import { NextResponse, type NextRequest } from "next/server";
import { AttemptTracker, constantTimeEqual } from "@/lib/pin";

// docs/06-pin-lock.md. The tracker is per-instance memory: it raises the
// cost of brute force without eliminating it, which is the accepted limit.
const attempts = new AttemptTracker({ max: 5, lockoutMs: 60_000 });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";

  const state = attempts.check(ip);
  if (state.locked) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${state.retryInSeconds}s.` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const expected = process.env.APP_PIN ?? "";
  const secret = process.env.SESSION_SECRET;

  if (!expected || !secret || !constantTimeEqual(pin, expected)) {
    attempts.fail(ip);
    // Deliberately vague: don't reveal whether the PIN was close or the
    // length was wrong.
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  attempts.reset(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "tt_session",
    value: secret,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days — this is a personal device
  });
  return res;
}
