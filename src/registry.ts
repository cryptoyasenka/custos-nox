import type { Alert, Detector, SolanaEvent } from "./types/events.js";

const DEFAULT_DETECTOR_TIMEOUT_MS = 5_000;

export interface DispatchOptions {
  timeoutMs?: number;
}

// `dispatch` is the fan-in point: every detector sees every event and returns
// zero or one alert. We race each detector against a timeout and turn both
// throws and timeouts into low-severity operational alerts so they surface in
// the same sinks users already monitor (instead of disappearing into stderr).
export async function dispatch(
  event: SolanaEvent,
  detectors: Detector[],
  options: DispatchOptions = {},
): Promise<Alert[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_DETECTOR_TIMEOUT_MS;

  const results = await Promise.all(
    detectors.map(async (d) => {
      try {
        return await withTimeout(d.inspect(event), timeoutMs, d.name);
      } catch (err) {
        if (err instanceof DetectorTimeoutError) {
          process.stderr.write(`[custos] detector ${d.name} timed out after ${timeoutMs}ms\n`);
          return buildOperationalAlert(event, d.name, "detector_timeout", {
            timeoutMs,
          });
        }
        process.stderr.write(`[custos] detector ${d.name} threw: ${String(err)}\n`);
        return buildOperationalAlert(event, d.name, "detector_error", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  return results.filter((a): a is Alert => a !== null);
}

class DetectorTimeoutError extends Error {
  constructor(public readonly detectorName: string) {
    super(`detector ${detectorName} timed out`);
    this.name = "DetectorTimeoutError";
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number, detectorName: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new DetectorTimeoutError(detectorName)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildOperationalAlert(
  event: SolanaEvent,
  detectorName: string,
  reason: "detector_timeout" | "detector_error",
  extra: Record<string, unknown>,
): Alert {
  const account =
    event.kind === "account_change" ? event.account.toBase58() : "<transaction-event>";
  const signature = event.kind === "account_change" ? event.signature : event.signature;
  return {
    detector: detectorName,
    severity: "low",
    subject:
      reason === "detector_timeout"
        ? `Detector ${detectorName} timed out processing ${account}`
        : `Detector ${detectorName} threw while processing ${account}`,
    txSignature: signature,
    cluster: event.cluster,
    timestamp: event.timestamp,
    explorerLink: "",
    context: { reason, account, ...extra },
  };
}
