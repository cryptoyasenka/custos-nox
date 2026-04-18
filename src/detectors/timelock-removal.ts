import { PublicKey } from "@solana/web3.js";
import { SPL_GOVERNANCE_PROGRAM_ID, parseGovernanceTimelock } from "../parsers/spl-governance.js";
import { parseSquadsMultisigTimelock } from "../parsers/squads.js";
import type {
  AccountChangeEvent,
  Alert,
  AlertSeverity,
  Cluster,
  Detector,
  SolanaEvent,
} from "../types/events.js";

export const SQUADS_V4_PROGRAM_ID = new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf");

export function classifySeverity(prev: number | null, curr: number | null): AlertSeverity | null {
  if (prev === null || curr === null) return null;
  if (prev <= 0) return null;
  if (curr >= prev) return null;
  if (curr === 0) return "critical";
  if (curr < prev / 2) return "high";
  return null;
}

function buildExplorerLink(signature: string | null, account: PublicKey, cluster: Cluster): string {
  const suffix = cluster === "mainnet" ? "" : `?cluster=${cluster}`;
  if (signature) return `https://solscan.io/tx/${signature}${suffix}`;
  return `https://solscan.io/account/${account.toBase58()}${suffix}`;
}

interface BuildAlertArgs {
  detectorName: string;
  event: AccountChangeEvent;
  subject: string;
  severity: AlertSeverity;
  context: Record<string, unknown>;
}

function buildTimelockAlert(args: BuildAlertArgs): Alert {
  return {
    detector: args.detectorName,
    severity: args.severity,
    subject: args.subject,
    txSignature: args.event.signature,
    cluster: args.event.cluster,
    timestamp: args.event.timestamp,
    explorerLink: buildExplorerLink(args.event.signature, args.event.account, args.event.cluster),
    context: args.context,
  };
}

type TimelockParser = (buf: Buffer) => number | null;

interface DetectorSpec {
  name: string;
  description: string;
  watchedProgram: PublicKey;
  parse: TimelockParser;
  subjectLabel: string;
}

function makeTimelockDetector(spec: DetectorSpec): Detector {
  return {
    name: spec.name,
    description: spec.description,
    async inspect(event: SolanaEvent): Promise<Alert | null> {
      if (event.kind !== "account_change") return null;
      if (!event.program.equals(spec.watchedProgram)) return null;
      if (event.previousData && event.data.equals(event.previousData)) return null;

      const prev = event.previousData ? spec.parse(event.previousData) : null;
      const curr = spec.parse(event.data);

      if (event.previousData && prev !== null && curr === null) {
        return buildTimelockAlert({
          detectorName: spec.name,
          event,
          severity: "medium",
          subject: `${spec.subjectLabel} ${event.account.toBase58()} timelock format became unparseable`,
          context: {
            reason: "parse_failure",
            previousTimelockSeconds: prev,
            account: event.account.toBase58(),
          },
        });
      }

      if (prev === null || curr === null) return null;

      const severity = classifySeverity(prev, curr);
      if (!severity) return null;

      const subject =
        curr === 0
          ? `Timelock removed on ${spec.subjectLabel} ${event.account.toBase58()}`
          : `Timelock weakened ${prev}s → ${curr}s on ${spec.subjectLabel} ${event.account.toBase58()}`;

      return buildTimelockAlert({
        detectorName: spec.name,
        event,
        severity,
        subject,
        context: {
          reason: "timelock_reduced",
          previousTimelockSeconds: prev,
          currentTimelockSeconds: curr,
          account: event.account.toBase58(),
        },
      });
    },
  };
}

export const SquadsTimelockRemovalDetector: Detector = makeTimelockDetector({
  name: "squads-timelock-removal",
  description:
    "Alerts when a Squads v4 multisig's time_lock drops to zero or is reduced below half.",
  watchedProgram: SQUADS_V4_PROGRAM_ID,
  parse: parseSquadsMultisigTimelock,
  subjectLabel: "multisig",
});

export const SplGovernanceTimelockRemovalDetector: Detector = makeTimelockDetector({
  name: "spl-governance-timelock-removal",
  description:
    "Alerts when an SPL Governance account's transactions_hold_up_time drops to zero or is reduced below half.",
  watchedProgram: SPL_GOVERNANCE_PROGRAM_ID,
  parse: parseGovernanceTimelock,
  subjectLabel: "governance",
});
