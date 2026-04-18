import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { squadsMultisigDiscriminator } from "../parsers/squads.js";
import type { AccountChangeEvent, TransactionEvent } from "../types/events.js";
import {
  SQUADS_V4_PROGRAM_ID,
  SplGovernanceTimelockRemovalDetector,
  SquadsTimelockRemovalDetector,
  classifySeverity,
} from "./timelock-removal.js";

function buildSquadsBuffer(
  timeLock: number,
  opts: { disc?: Buffer; cosmetic?: number } = {},
): Buffer {
  const disc = opts.disc ?? squadsMultisigDiscriminator();
  const createKey = Buffer.alloc(32, 0x11);
  const configAuthority = Buffer.alloc(32, 0x22);
  const threshold = Buffer.alloc(2);
  threshold.writeUInt16LE(3, 0);
  const tl = Buffer.alloc(4);
  tl.writeUInt32LE(timeLock, 0);
  const tail = Buffer.alloc(32, opts.cosmetic ?? 0);
  return Buffer.concat([disc, createKey, configAuthority, threshold, tl, tail]);
}

const STUB_ACCOUNT = new PublicKey("11111111111111111111111111111112");
const OTHER_PROGRAM = new PublicKey("11111111111111111111111111111113");

function accountChangeEvent(opts: {
  data: Buffer;
  previousData: Buffer | null;
  program?: PublicKey;
  signature?: string | null;
  cluster?: "mainnet" | "devnet" | "testnet";
}): AccountChangeEvent {
  return {
    kind: "account_change",
    program: opts.program ?? SQUADS_V4_PROGRAM_ID,
    account: STUB_ACCOUNT,
    data: opts.data,
    previousData: opts.previousData,
    slot: 42,
    signature: opts.signature === undefined ? "sig123" : opts.signature,
    timestamp: 1700000000,
    cluster: opts.cluster ?? "mainnet",
  };
}

describe("classifySeverity", () => {
  it.each([
    [100, 0, "critical"],
    [86_400, 0, "critical"],
    [86_400, 3600, "high"],
    [86_400, 40_000, "high"],
    [100, 49, "high"],
    [100, 50, null],
    [100, 51, null],
    [100, 99, null],
    [100, 100, null],
    [100, 101, null],
    [100, 1000, null],
    [0, 0, null],
    [0, 100, null],
    [null, 100, null],
    [100, null, null],
    [null, null, null],
  ] as const)("prev=%s curr=%s → %s", (prev, curr, expected) => {
    expect(classifySeverity(prev, curr)).toBe(expected);
  });
});

describe("SquadsTimelockRemovalDetector", () => {
  it("returns null for TransactionEvent", async () => {
    const event: TransactionEvent = {
      kind: "transaction",
      program: SQUADS_V4_PROGRAM_ID,
      signature: "sig",
      slot: 1,
      timestamp: 1,
      cluster: "mainnet",
      instructions: [],
    };
    expect(await SquadsTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("returns null for a different program", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: buildSquadsBuffer(86_400),
      program: OTHER_PROGRAM,
    });
    expect(await SquadsTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("returns null when data is byte-equal to previousData", async () => {
    const buf = buildSquadsBuffer(86_400);
    const event = accountChangeEvent({ data: buf, previousData: Buffer.from(buf) });
    expect(await SquadsTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("emits critical alert when timelock drops to zero", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: buildSquadsBuffer(86_400),
    });
    const alert = await SquadsTimelockRemovalDetector.inspect(event);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("critical");
    expect(alert?.detector).toBe("squads-timelock-removal");
    expect(alert?.subject).toContain("Timelock removed on multisig");
    expect(alert?.context).toMatchObject({
      reason: "timelock_reduced",
      previousTimelockSeconds: 86_400,
      currentTimelockSeconds: 0,
    });
    expect(alert?.explorerLink).toBe("https://solscan.io/tx/sig123");
    expect(alert?.txSignature).toBe("sig123");
    expect(alert?.cluster).toBe("mainnet");
  });

  it("emits high alert when timelock falls below 50%", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(3600),
      previousData: buildSquadsBuffer(86_400),
    });
    const alert = await SquadsTimelockRemovalDetector.inspect(event);
    expect(alert?.severity).toBe("high");
    expect(alert?.subject).toContain("Timelock weakened 86400s → 3600s");
    expect(alert?.context).toMatchObject({
      reason: "timelock_reduced",
      previousTimelockSeconds: 86_400,
      currentTimelockSeconds: 3600,
    });
  });

  it("returns null when timelock is exactly halved (not strictly < prev/2)", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(43_200),
      previousData: buildSquadsBuffer(86_400),
    });
    expect(await SquadsTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("returns null for initial baseline (previousData null)", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(86_400),
      previousData: null,
    });
    expect(await SquadsTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("returns null when previous timelock was already zero", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: buildSquadsBuffer(0, { cosmetic: 0xff }),
    });
    expect(await SquadsTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("returns null when previousData is unparseable (no prior baseline to compare)", async () => {
    const badPrev = buildSquadsBuffer(86_400, {
      disc: Buffer.from("DEADBEEFDEADBEEF", "hex"),
    });
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: badPrev,
    });
    expect(await SquadsTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("emits medium parse_failure alert when prev parsed but curr cannot", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(86_400, {
        disc: Buffer.from("DEADBEEFDEADBEEF", "hex"),
      }),
      previousData: buildSquadsBuffer(86_400),
    });
    const alert = await SquadsTimelockRemovalDetector.inspect(event);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("medium");
    expect(alert?.context).toMatchObject({
      reason: "parse_failure",
      previousTimelockSeconds: 86_400,
    });
    expect(alert?.subject).toContain("format became unparseable");
  });

  it("adds cluster query param for devnet explorer link", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: buildSquadsBuffer(86_400),
      cluster: "devnet",
    });
    const alert = await SquadsTimelockRemovalDetector.inspect(event);
    expect(alert?.explorerLink).toBe("https://solscan.io/tx/sig123?cluster=devnet");
  });

  it("falls back to account explorer link when signature is null", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: buildSquadsBuffer(86_400),
      signature: null,
    });
    const alert = await SquadsTimelockRemovalDetector.inspect(event);
    expect(alert?.txSignature).toBeNull();
    expect(alert?.explorerLink).toBe(`https://solscan.io/account/${STUB_ACCOUNT.toBase58()}`);
  });
});

describe("SplGovernanceTimelockRemovalDetector", () => {
  it("returns null for TransactionEvent", async () => {
    const event: TransactionEvent = {
      kind: "transaction",
      program: SQUADS_V4_PROGRAM_ID,
      signature: "sig",
      slot: 1,
      timestamp: 1,
      cluster: "mainnet",
      instructions: [],
    };
    expect(await SplGovernanceTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("returns null for a Squads account change (wrong program)", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: buildSquadsBuffer(86_400),
      program: SQUADS_V4_PROGRAM_ID,
    });
    expect(await SplGovernanceTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("returns null when both previousData and data are unparseable", async () => {
    const garbage = Buffer.alloc(300, 0xff);
    const event = accountChangeEvent({
      data: garbage,
      previousData: Buffer.alloc(300, 0xee),
      program: new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw"),
    });
    expect(await SplGovernanceTimelockRemovalDetector.inspect(event)).toBeNull();
  });

  it("has the expected name and description", () => {
    expect(SplGovernanceTimelockRemovalDetector.name).toBe("spl-governance-timelock-removal");
    expect(SplGovernanceTimelockRemovalDetector.description).toContain("transactions_hold_up_time");
  });
});
