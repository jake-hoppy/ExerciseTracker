import { describe, expect, it } from "vitest";
import { AttemptTracker, constantTimeEqual } from "./pin";

describe("constantTimeEqual", () => {
  it("matches only identical strings", () => {
    expect(constantTimeEqual("1234", "1234")).toBe(true);
    expect(constantTimeEqual("1234", "1235")).toBe(false);
    expect(constantTimeEqual("1234", "123")).toBe(false);
    expect(constantTimeEqual("", "")).toBe(true);
  });
});

describe("AttemptTracker", () => {
  const make = () => {
    let t = 1_000_000;
    const tracker = new AttemptTracker({ max: 5, lockoutMs: 60_000, now: () => t });
    return { tracker, advance: (ms: number) => (t += ms) };
  };

  it("is open until the fifth failure", () => {
    const { tracker } = make();
    for (let i = 0; i < 4; i++) {
      tracker.fail("ip");
      expect(tracker.check("ip")).toEqual({ locked: false });
    }
    tracker.fail("ip");
    expect(tracker.check("ip")).toEqual({ locked: true, retryInSeconds: 60 });
  });

  it("counts down and reopens after the lockout", () => {
    const { tracker, advance } = make();
    for (let i = 0; i < 5; i++) tracker.fail("ip");
    advance(45_000);
    expect(tracker.check("ip")).toEqual({ locked: true, retryInSeconds: 15 });
    advance(15_000);
    expect(tracker.check("ip")).toEqual({ locked: false });
  });

  it("starts a fresh count after a lockout expires", () => {
    const { tracker, advance } = make();
    for (let i = 0; i < 5; i++) tracker.fail("ip");
    advance(60_000);
    tracker.fail("ip");
    expect(tracker.check("ip")).toEqual({ locked: false });
  });

  it("clears on success and keeps keys separate", () => {
    const { tracker } = make();
    for (let i = 0; i < 5; i++) tracker.fail("a");
    tracker.fail("b");
    expect(tracker.check("b")).toEqual({ locked: false });
    tracker.reset("a");
    expect(tracker.check("a")).toEqual({ locked: false });
  });
});
