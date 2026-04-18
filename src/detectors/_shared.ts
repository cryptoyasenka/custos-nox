import type { PublicKey } from "@solana/web3.js";
import type {
  AccountChangeEvent,
  Alert,
  AlertSeverity,
  Cluster,
  Detector,
  SolanaEvent,
} from "../types/events.js";

export function classifySeverity(prev: number | null, curr: number | null): AlertSeverity | null {
  if (prev === null || curr === null) return null;
  if (prev <= 0) return null;
  if (curr >= prev) return null;
  if (curr === 0) return "critical";
  if (curr < prev / 2) return "high";
  return null;
}

export function buildExplorerLink(
  signature: string | null,
  account: PublicKey,
  cluster: Cluster,
): string {
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

function buildAlert(args: BuildAlertArgs): Alert {
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

export interface FieldWeakeningSpec {
  name: string;
  description: string;
  watchedProgram: PublicKey;
  parse: (buf: Buffer) => number | null;
  subject: {
    critical: (accountBase58: string) => string;
    high: (prev: number, curr: number, accountBase58: string) => string;
    parseFailure: (accountBase58: string) => string;
  };
  contextKeys: {
    prev: string;
    curr: string;
  };
  reasonWeakened: string;
}

export function makeFieldWeakeningDetector(spec: FieldWeakeningSpec): Detector {
  return {
    name: spec.name,
    description: spec.description,
    async inspect(event: SolanaEvent): Promise<Alert | null> {
      if (event.kind !== "account_change") return null;
      if (!event.program.equals(spec.watchedProgram)) return null;
      if (event.previousData && event.data.equals(event.previousData)) return null;

      const prev = event.previousData ? spec.parse(event.previousData) : null;
      const curr = spec.parse(event.data);
      const accountBase58 = event.account.toBase58();

      if (event.previousData && prev !== null && curr === null) {
        return buildAlert({
          detectorName: spec.name,
          event,
          severity: "medium",
          subject: spec.subject.parseFailure(accountBase58),
          context: {
            reason: "parse_failure",
            [spec.contextKeys.prev]: prev,
            account: accountBase58,
          },
        });
      }

      if (prev === null || curr === null) return null;

      const severity = classifySeverity(prev, curr);
      if (!severity) return null;

      const subject =
        curr === 0
          ? spec.subject.critical(accountBase58)
          : spec.subject.high(prev, curr, accountBase58);

      return buildAlert({
        detectorName: spec.name,
        event,
        severity,
        subject,
        context: {
          reason: spec.reasonWeakened,
          [spec.contextKeys.prev]: prev,
          [spec.contextKeys.curr]: curr,
          account: accountBase58,
        },
      });
    },
  };
}
