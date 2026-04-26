import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

const MULTISIG_DISCRIMINATOR: Buffer = createHash("sha256")
  .update("account:Multisig")
  .digest()
  .subarray(0, 8);

// Squads v4 on-chain cap: 90 days in seconds. Anything above is almost
// certainly an unparseable byte pattern, not a legitimate value.
export const SQUADS_MAX_TIME_LOCK = 90 * 24 * 60 * 60;

// Defensive sanity cap for the members vector. Squads v4 stores the count as
// u32 LE; a corrupt buffer could claim millions and OOM the parser. Real
// multisigs cap out around 10 signers; 256 is generous for legitimate use.
export const SQUADS_MAX_MEMBERS = 256;

const MIN_BUFFER_LENGTH = 8 + 32 + 32 + 2 + 4;
const THRESHOLD_OFFSET = 8 + 32 + 32;
const TIME_LOCK_OFFSET = 8 + 32 + 32 + 2;
const MEMBERS_VECTOR_OFFSET = 8 + 32 + 32 + 2 + 4;
const MEMBER_SIZE = 32 + 1; // Pubkey + permissions byte

export function parseSquadsMultisigTimelock(buf: Buffer): number | null {
  if (buf.length < MIN_BUFFER_LENGTH) return null;
  if (!buf.subarray(0, 8).equals(MULTISIG_DISCRIMINATOR)) return null;
  const value = buf.readUInt32LE(TIME_LOCK_OFFSET);
  if (value > SQUADS_MAX_TIME_LOCK) return null;
  return value;
}

export function parseSquadsMultisigThreshold(buf: Buffer): number | null {
  if (buf.length < MIN_BUFFER_LENGTH) return null;
  if (!buf.subarray(0, 8).equals(MULTISIG_DISCRIMINATOR)) return null;
  return buf.readUInt16LE(THRESHOLD_OFFSET);
}

export function squadsMultisigDiscriminator(): Buffer {
  return Buffer.from(MULTISIG_DISCRIMINATOR);
}

// Returns the multisig's signer pubkeys as base58 strings, sorted lexically
// for stable diffing across runs (the on-chain order is implementation
// detail and detectors should not depend on it). Returns null on any layout
// inconsistency so the caller can route to a parseFailure alert.
export function parseSquadsMultisigSigners(buf: Buffer): string[] | null {
  if (buf.length < MEMBERS_VECTOR_OFFSET + 4) return null;
  if (!buf.subarray(0, 8).equals(MULTISIG_DISCRIMINATOR)) return null;

  const count = buf.readUInt32LE(MEMBERS_VECTOR_OFFSET);
  if (count > SQUADS_MAX_MEMBERS) return null;

  const membersStart = MEMBERS_VECTOR_OFFSET + 4;
  if (buf.length < membersStart + count * MEMBER_SIZE) return null;

  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const offset = membersStart + i * MEMBER_SIZE;
    const keyBytes = buf.subarray(offset, offset + 32);
    keys.push(new PublicKey(keyBytes).toBase58());
  }
  return keys.sort();
}
