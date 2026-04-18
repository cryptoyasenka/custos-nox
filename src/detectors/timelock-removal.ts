import { PublicKey } from "@solana/web3.js";
import { SPL_GOVERNANCE_PROGRAM_ID, parseGovernanceTimelock } from "../parsers/spl-governance.js";
import { parseSquadsMultisigTimelock } from "../parsers/squads.js";
import type { Detector } from "../types/events.js";
import { classifySeverity, makeFieldWeakeningDetector } from "./_shared.js";

export { classifySeverity };

export const SQUADS_V4_PROGRAM_ID = new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf");

export const SquadsTimelockRemovalDetector: Detector = makeFieldWeakeningDetector({
  name: "squads-timelock-removal",
  description:
    "Alerts when a Squads v4 multisig's time_lock drops to zero or is reduced below half.",
  watchedProgram: SQUADS_V4_PROGRAM_ID,
  parse: parseSquadsMultisigTimelock,
  subject: {
    critical: (acct) => `Timelock removed on multisig ${acct}`,
    high: (prev, curr, acct) => `Timelock weakened ${prev}s → ${curr}s on multisig ${acct}`,
    parseFailure: (acct) => `multisig ${acct} timelock format became unparseable`,
  },
  contextKeys: { prev: "previousTimelockSeconds", curr: "currentTimelockSeconds" },
  reasonWeakened: "timelock_reduced",
});

export const SplGovernanceTimelockRemovalDetector: Detector = makeFieldWeakeningDetector({
  name: "spl-governance-timelock-removal",
  description:
    "Alerts when an SPL Governance account's transactions_hold_up_time drops to zero or is reduced below half.",
  watchedProgram: SPL_GOVERNANCE_PROGRAM_ID,
  parse: parseGovernanceTimelock,
  subject: {
    critical: (acct) => `Timelock removed on governance ${acct}`,
    high: (prev, curr, acct) => `Timelock weakened ${prev}s → ${curr}s on governance ${acct}`,
    parseFailure: (acct) => `governance ${acct} timelock format became unparseable`,
  },
  contextKeys: { prev: "previousTimelockSeconds", curr: "currentTimelockSeconds" },
  reasonWeakened: "timelock_reduced",
});
