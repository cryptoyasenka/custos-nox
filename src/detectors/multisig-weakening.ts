import { parseSquadsMultisigThreshold } from "../parsers/squads.js";
import type { Detector } from "../types/events.js";
import { makeFieldWeakeningDetector } from "./_shared.js";
import { SQUADS_V4_PROGRAM_ID } from "./timelock-removal.js";

export const SquadsMultisigWeakeningDetector: Detector = makeFieldWeakeningDetector({
  name: "squads-multisig-weakening",
  description:
    "Alerts when a Squads v4 multisig's approval threshold drops to zero or is reduced below half (e.g. 5-of-7 → 1-of-7).",
  watchedProgram: SQUADS_V4_PROGRAM_ID,
  parse: parseSquadsMultisigThreshold,
  subject: {
    critical: (acct) => `Threshold dropped to zero on multisig ${acct}`,
    high: (prev, curr, acct) => `Threshold weakened ${prev} → ${curr} on multisig ${acct}`,
    parseFailure: (acct) => `multisig ${acct} threshold format became unparseable`,
  },
  contextKeys: { prev: "previousThreshold", curr: "currentThreshold" },
  reasonWeakened: "threshold_reduced",
});
