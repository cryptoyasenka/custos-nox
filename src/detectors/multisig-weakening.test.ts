import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { squadsMultisigDiscriminator } from "../parsers/squads.js";
import type { AccountChangeEvent, TransactionEvent } from "../types/events.js";
import { SquadsMultisigWeakeningDetector } from "./multisig-weakening.js";
import { SQUADS_V4_PROGRAM_ID } from "./timelock-removal.js";

function buildSquadsBuffer(
  threshold: number,
  opts: { disc?: Buffer; cosmetic?: number; timeLock?: number } = {},
): Buffer {
  const disc = opts.disc ?? squadsMultisigDiscriminator();
  const createKey = Buffer.alloc(32, 0x11);
  const configAuthority = Buffer.alloc(32, 0x22);
  const thr = Buffer.alloc(2);
  thr.writeUInt16LE(threshold, 0);
  const tl = Buffer.alloc(4);
  tl.writeUInt32LE(opts.timeLock ?? 86_400, 0);
  const tail = Buffer.alloc(32, opts.cosmetic ?? 0);
  return Buffer.concat([disc, createKey, configAuthority, thr, tl, tail]);
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
    slot: 100,
    signature: opts.signature === undefined ? "sigABC" : opts.signature,
    timestamp: 1700000000,
    cluster: opts.cluster ?? "mainnet",
  };
}

describe("SquadsMultisigWeakeningDetector", () => {
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
    expect(await SquadsMultisigWeakeningDetector.inspect(event)).toBeNull();
  });

  it("returns null for a different program", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(1),
      previousData: buildSquadsBuffer(5),
      program: OTHER_PROGRAM,
    });
    expect(await SquadsMultisigWeakeningDetector.inspect(event)).toBeNull();
  });

  it("returns null when data is byte-equal to previousData", async () => {
    const buf = buildSquadsBuffer(3);
    const event = accountChangeEvent({ data: buf, previousData: Buffer.from(buf) });
    expect(await SquadsMultisigWeakeningDetector.inspect(event)).toBeNull();
  });

  it("emits critical alert when threshold drops to zero", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: buildSquadsBuffer(5),
    });
    const alert = await SquadsMultisigWeakeningDetector.inspect(event);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("critical");
    expect(alert?.detector).toBe("squads-multisig-weakening");
    expect(alert?.subject).toContain("Threshold dropped to zero on multisig");
    expect(alert?.context).toMatchObject({
      reason: "threshold_reduced",
      previousThreshold: 5,
      currentThreshold: 0,
    });
    expect(alert?.explorerLink).toBe("https://solscan.io/tx/sigABC");
  });

  it("emits high alert when threshold drops below 50% (5-of-7 → 2-of-7)", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(2),
      previousData: buildSquadsBuffer(5),
    });
    const alert = await SquadsMultisigWeakeningDetector.inspect(event);
    expect(alert?.severity).toBe("high");
    expect(alert?.subject).toContain("Threshold weakened 5 → 2");
    expect(alert?.context).toMatchObject({
      reason: "threshold_reduced",
      previousThreshold: 5,
      currentThreshold: 2,
    });
  });

  it("returns null when threshold is reduced by less than half (6-of-10 → 4-of-10)", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(4),
      previousData: buildSquadsBuffer(6),
    });
    expect(await SquadsMultisigWeakeningDetector.inspect(event)).toBeNull();
  });

  it("returns null when threshold is exactly halved (4 → 2)", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(2),
      previousData: buildSquadsBuffer(4),
    });
    expect(await SquadsMultisigWeakeningDetector.inspect(event)).toBeNull();
  });

  it("returns null for initial baseline (previousData null)", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(3),
      previousData: null,
    });
    expect(await SquadsMultisigWeakeningDetector.inspect(event)).toBeNull();
  });

  it("returns null when threshold increased (strengthened, not weakened)", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(5),
      previousData: buildSquadsBuffer(3),
    });
    expect(await SquadsMultisigWeakeningDetector.inspect(event)).toBeNull();
  });

  it("ignores unchanged threshold even when other bytes differ", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(3, { cosmetic: 0xaa }),
      previousData: buildSquadsBuffer(3, { cosmetic: 0xbb }),
    });
    expect(await SquadsMultisigWeakeningDetector.inspect(event)).toBeNull();
  });

  it("emits medium parse_failure alert when prev parsed but curr cannot", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(5, { disc: Buffer.from("DEADBEEFDEADBEEF", "hex") }),
      previousData: buildSquadsBuffer(5),
    });
    const alert = await SquadsMultisigWeakeningDetector.inspect(event);
    expect(alert?.severity).toBe("medium");
    expect(alert?.context).toMatchObject({
      reason: "parse_failure",
      previousThreshold: 5,
    });
    expect(alert?.subject).toContain("format became unparseable");
  });

  it("adds cluster query param for devnet explorer link", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: buildSquadsBuffer(5),
      cluster: "devnet",
    });
    const alert = await SquadsMultisigWeakeningDetector.inspect(event);
    expect(alert?.explorerLink).toBe("https://solscan.io/tx/sigABC?cluster=devnet");
  });

  it("falls back to account explorer link when signature is null", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(0),
      previousData: buildSquadsBuffer(5),
      signature: null,
    });
    const alert = await SquadsMultisigWeakeningDetector.inspect(event);
    expect(alert?.txSignature).toBeNull();
    expect(alert?.explorerLink).toBe(`https://solscan.io/account/${STUB_ACCOUNT.toBase58()}`);
  });

  it("ignores threshold drop from 2 to 1 (common tweak, not below 50% strictly)", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(1),
      previousData: buildSquadsBuffer(2),
    });
    expect(await SquadsMultisigWeakeningDetector.inspect(event)).toBeNull();
  });

  it("flags a 10-of-10 → 1-of-10 drop as high", async () => {
    const event = accountChangeEvent({
      data: buildSquadsBuffer(1),
      previousData: buildSquadsBuffer(10),
    });
    const alert = await SquadsMultisigWeakeningDetector.inspect(event);
    expect(alert?.severity).toBe("high");
  });
});
