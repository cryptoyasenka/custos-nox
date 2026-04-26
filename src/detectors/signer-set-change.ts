import { parseSquadsMultisigSigners } from "../parsers/squads.js";
import type { AccountChangeEvent, Alert, Detector, SolanaEvent } from "../types/events.js";
import { buildExplorerLink } from "./_shared.js";
import { SQUADS_V4_PROGRAM_ID } from "./timelock-removal.js";

export const SIGNER_SET_CHANGE_DETECTOR_NAME = "squads-signer-set-change";

export const SignerSetChangeDetector: Detector = {
  name: SIGNER_SET_CHANGE_DETECTOR_NAME,
  description:
    "Alerts when a Squads v4 multisig's signer set is mutated (members added, removed, or rotated). " +
    "Drift-class chains overwrite the members vector to swap legitimate signers for attacker keys, " +
    "so any change to the set on a watched multisig is suspicious.",

  async inspect(event: SolanaEvent): Promise<Alert | null> {
    if (event.kind !== "account_change") return null;
    if (!event.program.equals(SQUADS_V4_PROGRAM_ID)) return null;
    if (event.previousData && event.data.equals(event.previousData)) return null;

    // No baseline = first time we've seen this account. Can't diff a set
    // against nothing, and the daemon already alerts on initialization
    // through other channels (privileged-nonce, etc.). Stay silent.
    if (!event.previousData) return null;

    const prev = parseSquadsMultisigSigners(event.previousData);
    const curr = parseSquadsMultisigSigners(event.data);
    const accountBase58 = event.account.toBase58();

    // Was parseable, now isn't — operational signal (something rewrote the
    // members vector into a shape we can't read). Match the parse-failure
    // pattern from makeFieldWeakeningDetector so the dashboard treats it
    // uniformly with timelock/threshold parse failures.
    if (prev !== null && curr === null) {
      return buildAlert(event, {
        severity: "medium",
        subject: `multisig ${accountBase58} members vector became unparseable`,
        context: {
          reason: "parse_failure",
          account: accountBase58,
          previousCount: prev.length,
        },
      });
    }

    if (prev === null || curr === null) return null;

    const prevSet = new Set(prev);
    const currSet = new Set(curr);
    const removed = prev.filter((k) => !currSet.has(k));
    const added = curr.filter((k) => !prevSet.has(k));

    if (removed.length === 0 && added.length === 0) return null;

    // Removal of a legitimate signer is the high-impact case (attacker
    // evicts honest co-signers, drops effective threshold). Pure addition
    // also weakens the multisig (same threshold over a larger set, plus a
    // new key that may belong to the attacker) but the immediate blast
    // radius is smaller, so we keep it at medium.
    const severity: Alert["severity"] = removed.length > 0 ? "high" : "medium";

    let subject: string;
    if (removed.length > 0 && added.length > 0) {
      subject = `Multisig ${accountBase58}: ${removed.length} signer(s) removed, ${added.length} added`;
    } else if (removed.length > 0) {
      subject = `Multisig ${accountBase58}: ${removed.length} signer(s) removed`;
    } else {
      subject = `Multisig ${accountBase58}: ${added.length} signer(s) added`;
    }

    return buildAlert(event, {
      severity,
      subject,
      context: {
        reason: "signer_set_changed",
        account: accountBase58,
        added,
        removed,
        previousCount: prev.length,
        currentCount: curr.length,
      },
    });
  },
};

interface BuildAlertArgs {
  severity: Alert["severity"];
  subject: string;
  context: Record<string, unknown>;
}

function buildAlert(event: AccountChangeEvent, args: BuildAlertArgs): Alert {
  return {
    detector: SIGNER_SET_CHANGE_DETECTOR_NAME,
    severity: args.severity,
    subject: args.subject,
    txSignature: event.signature,
    cluster: event.cluster,
    timestamp: event.timestamp,
    explorerLink: buildExplorerLink(event.signature, event.account, event.cluster),
    context: args.context,
  };
}
