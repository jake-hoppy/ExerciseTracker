import { afterEach, describe, expect, it, vi } from "vitest";
import { pendingId } from "./client-ids";

describe("pendingId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is unique across calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => pendingId()));
    expect(ids.size).toBe(1000);
  });

  it("does not need crypto.randomUUID (plain-http LAN pages lack it)", () => {
    vi.stubGlobal("crypto", {});
    expect(() => pendingId()).not.toThrow();
    expect(pendingId()).not.toBe(pendingId());
  });
});
