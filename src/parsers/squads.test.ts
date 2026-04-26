import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  SQUADS_MAX_MEMBERS,
  SQUADS_MAX_TIME_LOCK,
  parseSquadsMultisigSigners,
  parseSquadsMultisigThreshold,
  parseSquadsMultisigTimelock,
  squadsMultisigDiscriminator,
} from "./squads.js";

function buildMultisigBuffer(opts: {
  timeLock: number;
  discriminator?: Buffer;
  threshold?: number;
  extraBytes?: number;
  signers?: PublicKey[];
  // Override the on-disk count without changing the actual member bytes
  // (lets tests construct truncated/inconsistent buffers).
  declaredCount?: number;
}): Buffer {
  const disc = opts.discriminator ?? squadsMultisigDiscriminator();
  const createKey = Buffer.alloc(32, 0x11);
  const configAuthority = Buffer.alloc(32, 0x22);
  const threshold = Buffer.alloc(2);
  threshold.writeUInt16LE(opts.threshold ?? 3, 0);
  const timeLock = Buffer.alloc(4);
  timeLock.writeUInt32LE(opts.timeLock, 0);

  const signers = opts.signers ?? [];
  const declaredCount = opts.declaredCount ?? signers.length;
  const memberCount = Buffer.alloc(4);
  memberCount.writeUInt32LE(declaredCount, 0);

  // Each member: 32-byte pubkey + 1-byte permissions (0x07 = all perms).
  const membersBytes = Buffer.concat(
    signers.map((s) => Buffer.concat([s.toBuffer(), Buffer.from([0x07])])),
  );

  const tail = Buffer.alloc(opts.extraBytes ?? 32, 0);
  return Buffer.concat([
    disc,
    createKey,
    configAuthority,
    threshold,
    timeLock,
    memberCount,
    membersBytes,
    tail,
  ]);
}

describe("parseSquadsMultisigTimelock", () => {
  it("reads a valid time_lock at byte offset 74", () => {
    const buf = buildMultisigBuffer({ timeLock: 86_400 });
    expect(parseSquadsMultisigTimelock(buf)).toBe(86_400);
  });

  it("reads zero timelock", () => {
    const buf = buildMultisigBuffer({ timeLock: 0 });
    expect(parseSquadsMultisigTimelock(buf)).toBe(0);
  });

  it("reads the maximum allowed timelock (~3 months)", () => {
    const buf = buildMultisigBuffer({ timeLock: SQUADS_MAX_TIME_LOCK });
    expect(parseSquadsMultisigTimelock(buf)).toBe(SQUADS_MAX_TIME_LOCK);
  });

  it("returns null when the value exceeds Squads MAX_TIME_LOCK (likely corrupt)", () => {
    const buf = buildMultisigBuffer({ timeLock: SQUADS_MAX_TIME_LOCK + 1 });
    expect(parseSquadsMultisigTimelock(buf)).toBeNull();
  });

  it("returns null for a completely empty buffer", () => {
    expect(parseSquadsMultisigTimelock(Buffer.alloc(0))).toBeNull();
  });

  it("returns null when buffer is shorter than the minimum header", () => {
    expect(parseSquadsMultisigTimelock(Buffer.alloc(77))).toBeNull();
  });

  it("returns null when discriminator does not match account:Multisig", () => {
    const wrongDisc = Buffer.from("DEADBEEFDEADBEEF", "hex");
    const buf = buildMultisigBuffer({ timeLock: 3600, discriminator: wrongDisc });
    expect(parseSquadsMultisigTimelock(buf)).toBeNull();
  });

  it("accepts a buffer with trailing members vector without reading past time_lock", () => {
    const buf = buildMultisigBuffer({ timeLock: 172_800, extraBytes: 1024 });
    expect(parseSquadsMultisigTimelock(buf)).toBe(172_800);
  });

  it("time_lock byte offset is exactly 74 (anchor disc + create_key + config_authority + threshold)", () => {
    const buf = buildMultisigBuffer({ timeLock: 12_345 });
    expect(buf.readUInt32LE(74)).toBe(12_345);
  });

  it("discriminator is exactly 8 bytes of sha256('account:Multisig')", () => {
    const disc = squadsMultisigDiscriminator();
    expect(disc.length).toBe(8);
  });
});

describe("parseSquadsMultisigThreshold", () => {
  it("reads a standard m-of-n threshold at byte offset 72", () => {
    const buf = buildMultisigBuffer({ timeLock: 0, threshold: 5 });
    expect(parseSquadsMultisigThreshold(buf)).toBe(5);
  });

  it("reads threshold of 1 (single-sig multisig, legitimate)", () => {
    const buf = buildMultisigBuffer({ timeLock: 0, threshold: 1 });
    expect(parseSquadsMultisigThreshold(buf)).toBe(1);
  });

  it("reads threshold of 0 verbatim (invalid on-chain but detector needs this signal)", () => {
    const buf = buildMultisigBuffer({ timeLock: 0, threshold: 0 });
    expect(parseSquadsMultisigThreshold(buf)).toBe(0);
  });

  it("threshold byte offset is exactly 72 (disc + create_key + config_authority)", () => {
    const buf = buildMultisigBuffer({ timeLock: 0, threshold: 777 });
    expect(buf.readUInt16LE(72)).toBe(777);
  });

  it("returns null when discriminator does not match", () => {
    const wrongDisc = Buffer.from("DEADBEEFDEADBEEF", "hex");
    const buf = buildMultisigBuffer({ timeLock: 0, threshold: 3, discriminator: wrongDisc });
    expect(parseSquadsMultisigThreshold(buf)).toBeNull();
  });

  it("returns null when buffer is shorter than the minimum header", () => {
    expect(parseSquadsMultisigThreshold(Buffer.alloc(71))).toBeNull();
  });

  it("returns null for a completely empty buffer", () => {
    expect(parseSquadsMultisigThreshold(Buffer.alloc(0))).toBeNull();
  });
});

describe("parseSquadsMultisigSigners", () => {
  it("parses a 3-member multisig and returns base58 keys", () => {
    const a = Keypair.generate().publicKey;
    const b = Keypair.generate().publicKey;
    const c = Keypair.generate().publicKey;
    const buf = buildMultisigBuffer({ timeLock: 0, signers: [a, b, c] });
    const out = parseSquadsMultisigSigners(buf);
    expect(out).not.toBeNull();
    expect(out).toHaveLength(3);
    expect(out).toEqual([a.toBase58(), b.toBase58(), c.toBase58()].sort());
  });

  it("parses a single-signer multisig", () => {
    const k = Keypair.generate().publicKey;
    const buf = buildMultisigBuffer({ timeLock: 0, signers: [k] });
    expect(parseSquadsMultisigSigners(buf)).toEqual([k.toBase58()]);
  });

  it("parses an empty members vector (count=0) as an empty array", () => {
    const buf = buildMultisigBuffer({ timeLock: 0, signers: [] });
    expect(parseSquadsMultisigSigners(buf)).toEqual([]);
  });

  it("returns members sorted lexically regardless of on-chain order", () => {
    // Pubkey('z…') would sort after Pubkey('1…'). Build deliberately
    // out-of-order keys (sort by reversed base58) and verify output is sorted.
    const keys = Array.from({ length: 5 }, () => Keypair.generate().publicKey);
    // Reverse-sort input so we can detect that parser sorts the output.
    keys.sort((a, b) => b.toBase58().localeCompare(a.toBase58()));
    const buf = buildMultisigBuffer({ timeLock: 0, signers: keys });
    const out = parseSquadsMultisigSigners(buf);
    expect(out).not.toBeNull();
    const sorted = [...(out as string[])].sort();
    expect(out).toEqual(sorted);
  });

  it("returns null when discriminator does not match", () => {
    const wrong = Buffer.from("DEADBEEFDEADBEEF", "hex");
    const k = Keypair.generate().publicKey;
    const buf = buildMultisigBuffer({ timeLock: 0, discriminator: wrong, signers: [k] });
    expect(parseSquadsMultisigSigners(buf)).toBeNull();
  });

  it("returns null when buffer too short to even read the count", () => {
    expect(parseSquadsMultisigSigners(Buffer.alloc(50))).toBeNull();
  });

  it("returns null when declared count claims more members than the buffer holds", () => {
    const k = Keypair.generate().publicKey;
    // declared=10, only 1 signer's bytes actually present
    const buf = buildMultisigBuffer({
      timeLock: 0,
      signers: [k],
      declaredCount: 10,
      extraBytes: 0,
    });
    expect(parseSquadsMultisigSigners(buf)).toBeNull();
  });

  it("returns null when declared count exceeds SQUADS_MAX_MEMBERS sanity cap", () => {
    const buf = buildMultisigBuffer({
      timeLock: 0,
      signers: [],
      declaredCount: SQUADS_MAX_MEMBERS + 1,
    });
    expect(parseSquadsMultisigSigners(buf)).toBeNull();
  });

  it("returns null on a completely empty buffer", () => {
    expect(parseSquadsMultisigSigners(Buffer.alloc(0))).toBeNull();
  });

  it("ignores the permissions byte (does not include it in the key)", () => {
    const k = Keypair.generate().publicKey;
    const buf = buildMultisigBuffer({ timeLock: 0, signers: [k] });
    const out = parseSquadsMultisigSigners(buf);
    expect(out?.[0]).toBe(k.toBase58());
    // Verify the returned string is exactly a 32-byte base58 encoded key, not 33.
    const decoded = new PublicKey(out?.[0] ?? "").toBuffer();
    expect(decoded.length).toBe(32);
  });
});
