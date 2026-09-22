"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// Four digits, typed one-handed. Submits itself on the fourth digit; on
// failure it shakes, clears and refocuses, showing the server's message
// verbatim (already appropriately vague). No button, no "forgot" link.
export function PinForm({ from }: { from: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      if (res.ok) {
        router.replace(from);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Incorrect PIN.");
    } catch {
      setError("Couldn't reach the server.");
    }
    setShake(true);
    setTimeout(() => setShake(false), 300);
    setPin("");
    setBusy(false);
    input.current?.focus();
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col items-center gap-4">
      <input
        ref={input}
        autoFocus
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoComplete="one-time-code"
        aria-label="PIN"
        aria-describedby={error ? "pin-error" : undefined}
        value={pin}
        disabled={busy}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
          setPin(v);
          setError(null);
          if (v.length === 4) void submit(v);
        }}
        className={`h-16 w-40 rounded-card border border-line bg-bg-alt text-center font-mono text-3xl tracking-[0.5em] text-ink ${
          shake ? "animate-shake border-danger" : ""
        }`}
      />
      <p id="pin-error" role="alert" className="min-h-6 font-mono text-sm text-danger">
        {error}
      </p>
    </form>
  );
}
