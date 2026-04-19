import { PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { dispatch } from "./registry.js";
import type { Alert, Detector, SolanaEvent } from "./types/events.js";

const NOOP_EVENT: SolanaEvent = {
  kind: "account_change",
  program: new PublicKey("11111111111111111111111111111111"),
  account: new PublicKey("11111111111111111111111111111112"),
  data: Buffer.alloc(0),
  previousData: null,
  slot: 1,
  signature: null,
  timestamp: 0,
  cluster: "devnet",
};

function detectorReturning(name: string, alert: Alert | null): Detector {
  return {
    name,
    description: "",
    inspect: vi.fn().mockResolvedValue(alert),
  };
}

function dummyAlert(name: string): Alert {
  return {
    detector: name,
    severity: "high",
    subject: "test",
    txSignature: null,
    cluster: "devnet",
    timestamp: 0,
    explorerLink: "",
    context: {},
  };
}

describe("dispatch", () => {
  it("returns only non-null alerts", async () => {
    const a = dummyAlert("a");
    const detectors = [
      detectorReturning("a", a),
      detectorReturning("b", null),
      detectorReturning("c", dummyAlert("c")),
    ];
    const alerts = await dispatch(NOOP_EVENT, detectors);
    expect(alerts.map((x) => x.detector)).toEqual(["a", "c"]);
  });

  it("calls every detector exactly once per event", async () => {
    const detectors = [detectorReturning("a", null), detectorReturning("b", null)];
    await dispatch(NOOP_EVENT, detectors);
    for (const d of detectors) {
      expect(d.inspect).toHaveBeenCalledTimes(1);
      expect(d.inspect).toHaveBeenCalledWith(NOOP_EVENT);
    }
  });

  it("surfaces detector errors as low-severity operational alerts", async () => {
    const throwing: Detector = {
      name: "boom",
      description: "",
      inspect: vi.fn().mockRejectedValue(new Error("bad parse")),
    };
    const good = detectorReturning("ok", dummyAlert("ok"));
    const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const alerts = await dispatch(NOOP_EVENT, [throwing, good]);
    expect(alerts).toHaveLength(2);
    const opAlert = alerts.find((a) => a.detector === "boom");
    expect(opAlert?.severity).toBe("low");
    expect(opAlert?.context.reason).toBe("detector_error");
    expect(opAlert?.context.error).toBe("bad parse");
    expect(alerts.find((a) => a.detector === "ok")).toBeDefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("emits a detector_timeout alert when a detector hangs", async () => {
    const hanging: Detector = {
      name: "slow",
      description: "",
      inspect: vi.fn().mockImplementation(() => new Promise(() => {})),
    };
    const fast = detectorReturning("fast", dummyAlert("fast"));
    const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const alerts = await dispatch(NOOP_EVENT, [hanging, fast], { timeoutMs: 10 });
    expect(alerts).toHaveLength(2);
    const timeoutAlert = alerts.find((a) => a.detector === "slow");
    expect(timeoutAlert?.severity).toBe("low");
    expect(timeoutAlert?.context.reason).toBe("detector_timeout");
    expect(timeoutAlert?.context.timeoutMs).toBe(10);
    expect(alerts.find((a) => a.detector === "fast")?.severity).toBe("high");
    errSpy.mockRestore();
  });

  it("returns empty array when no detectors", async () => {
    expect(await dispatch(NOOP_EVENT, [])).toEqual([]);
  });

  it("one slow detector does not block the fast ones", async () => {
    const slow: Detector = {
      name: "slow",
      description: "",
      inspect: vi.fn().mockImplementation(() => new Promise(() => {})),
    };
    const fast = detectorReturning("fast", dummyAlert("fast"));
    const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const start = Date.now();
    await dispatch(NOOP_EVENT, [slow, fast], { timeoutMs: 50 });
    const elapsed = Date.now() - start;
    // Fast detector resolves immediately; dispatch waits out the timeout for
    // the slow one, but should not take materially longer than timeoutMs.
    expect(elapsed).toBeLessThan(200);
    errSpy.mockRestore();
  });
});
