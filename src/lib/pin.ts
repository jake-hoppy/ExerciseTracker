// The PIN gate's two testable parts (docs/06-pin-lock.md). Comparison is
// constant-time so `===` can't leak timing; attempts are rate limited so
// four digits aren't a trivial script. The tracker is in-memory by design —
// it resets when the instance recycles, which is an accepted limit.

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type AttemptCheck = { locked: false } | { locked: true; retryInSeconds: number };

export class AttemptTracker {
  private attempts = new Map<string, { n: number; until: number }>();
  private max: number;
  private lockoutMs: number;
  private now: () => number;

  constructor(opts: { max?: number; lockoutMs?: number; now?: () => number } = {}) {
    this.max = opts.max ?? 5;
    this.lockoutMs = opts.lockoutMs ?? 60_000;
    this.now = opts.now ?? (() => Date.now());
  }

  check(key: string): AttemptCheck {
    const rec = this.attempts.get(key);
    const now = this.now();
    if (rec && rec.until > now) {
      return { locked: true, retryInSeconds: Math.ceil((rec.until - now) / 1000) };
    }
    return { locked: false };
  }

  fail(key: string): void {
    const now = this.now();
    const rec = this.attempts.get(key);
    // A count that already served its lockout starts over.
    const n = (rec && rec.until !== 0 && rec.until <= now ? 0 : (rec?.n ?? 0)) + 1;
    this.attempts.set(key, { n, until: n >= this.max ? now + this.lockoutMs : 0 });
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
