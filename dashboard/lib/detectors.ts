export type DetectorStatus = "production" | "roadmap";

export interface DetectorMeta {
  id: string;
  name: string;
  subtitle: string;
  status: DetectorStatus;
  severity: "critical" | "high";
  attackStep: string;
  description: string;
}

export const DETECTORS: DetectorMeta[] = [
  {
    id: "spl-governance-timelock-removal",
    name: "Timelock Removal",
    subtitle: "Squads v4 + SPL Governance",
    status: "production",
    severity: "critical",
    attackStep: "Realm timelock 6 days → 0",
    description:
      "Fires when a governance timelock is removed or dropped below half. Matches the Drift step where the attacker collapsed the response window before draining funds.",
  },
  {
    id: "squads-multisig-weakening",
    name: "Multisig Weakening",
    subtitle: "Squads v4",
    status: "production",
    severity: "high",
    attackStep: "Squads threshold 5-of-9 → 1-of-9",
    description:
      "Fires when a Squads multisig signer threshold is reduced. Catches the moment a treasury becomes single-signer controlled — the irreversible pivot in most exploits.",
  },
  {
    id: "squads-signer-set-change",
    name: "Signer Set Change",
    subtitle: "Squads v4",
    status: "production",
    severity: "high",
    attackStep: "Members rotated — honest signers evicted",
    description:
      "Fires when a Squads multisig's members vector is mutated. Removal of a legitimate signer or rotation fires high; pure additions fire medium. Catches the takeover vector where an attacker swaps honest co-signers for their own keys.",
  },
  {
    id: "privileged-nonce",
    name: "Privileged Nonce",
    subtitle: "System Program",
    status: "production",
    severity: "critical",
    attackStep: "Durable nonce under attacker key",
    description:
      "Fires on initialization or authority rotation of a watched durable-nonce account. Flags the precondition for pre-signed, replay-at-will withdrawal transactions.",
  },
  {
    id: "stale-nonce-execution",
    name: "Stale Nonce Execution",
    subtitle: "System Program",
    status: "production",
    severity: "high",
    attackStep: "Pre-signed tx executed from stale nonce",
    description:
      "Fires when a durable nonce is advanced (a pre-signed transaction executes) more than 1 hour after the nonce was first initialized. Catches the final step in the Drift attack chain — the moment the attacker's pre-signed drain transaction lands.",
  },
];
