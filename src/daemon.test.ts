import { PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { StdoutAlertSink } from "./alerts/stdout.js";
import { DiscordAlertSink, FanOutAlertSink, SlackAlertSink } from "./alerts/webhook.js";
import type { DaemonConfig } from "./config.js";
import { buildSinkFromConfig, redactRpcUrl, validate } from "./daemon.js";

const PROGRAM = new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf");
const ACCOUNT = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");

function makeConfig(overrides: Partial<DaemonConfig> = {}): DaemonConfig {
  return {
    rpcUrl: "https://mainnet.helius-rpc.com/?api-key=secret-1234",
    wsUrl: "wss://mainnet.helius-rpc.com/?api-key=secret-1234",
    cluster: "mainnet",
    watch: [{ program: PROGRAM, account: ACCOUNT }],
    discordWebhookUrl: null,
    slackWebhookUrl: null,
    ...overrides,
  };
}

describe("redactRpcUrl", () => {
  it("strips path and query from a Helius URL with API key", () => {
    expect(redactRpcUrl("https://mainnet.helius-rpc.com/?api-key=secret-1234")).toBe(
      "https://mainnet.helius-rpc.com",
    );
  });

  it("strips path-embedded keys (QuickNode-style)", () => {
    expect(redactRpcUrl("https://example.quiknode.pro/abc123def456/")).toBe(
      "https://example.quiknode.pro",
    );
  });

  it("preserves http scheme for localhost", () => {
    expect(redactRpcUrl("http://localhost:8899")).toBe("http://localhost:8899");
  });

  it("returns a placeholder for unparseable input", () => {
    expect(redactRpcUrl("not a url")).toBe("<unparseable rpc url>");
  });

  it("never echoes the API key in the redacted form", () => {
    const out = redactRpcUrl("https://rpc.example.com/?api-key=ULTRA-SECRET-KEY-XYZ");
    expect(out).not.toContain("ULTRA-SECRET-KEY-XYZ");
    expect(out).not.toContain("api-key");
  });
});

describe("buildSinkFromConfig", () => {
  it("returns the bare stdout sink when no webhooks configured", () => {
    const sink = buildSinkFromConfig(makeConfig());
    expect(sink).toBeInstanceOf(StdoutAlertSink);
  });

  it("fans out to stdout + Discord when only Discord is configured", () => {
    const sink = buildSinkFromConfig(
      makeConfig({ discordWebhookUrl: "https://discord.com/api/webhooks/1/abc" }),
    );
    expect(sink).toBeInstanceOf(FanOutAlertSink);
    const sinks = (sink as unknown as { sinks: readonly unknown[] }).sinks;
    expect(sinks).toHaveLength(2);
    expect(sinks[0]).toBeInstanceOf(StdoutAlertSink);
    expect(sinks[1]).toBeInstanceOf(DiscordAlertSink);
  });

  it("fans out to stdout + Slack when only Slack is configured", () => {
    const sink = buildSinkFromConfig(
      makeConfig({ slackWebhookUrl: "https://hooks.slack.com/services/T/B/X" }),
    );
    expect(sink).toBeInstanceOf(FanOutAlertSink);
    const sinks = (sink as unknown as { sinks: readonly unknown[] }).sinks;
    expect(sinks).toHaveLength(2);
    expect(sinks[1]).toBeInstanceOf(SlackAlertSink);
  });

  it("includes both webhooks when both are configured", () => {
    const sink = buildSinkFromConfig(
      makeConfig({
        discordWebhookUrl: "https://discord.com/api/webhooks/1/abc",
        slackWebhookUrl: "https://hooks.slack.com/services/T/B/X",
      }),
    );
    expect(sink).toBeInstanceOf(FanOutAlertSink);
    const sinks = (sink as unknown as { sinks: readonly unknown[] }).sinks;
    expect(sinks).toHaveLength(3);
    expect(sinks[0]).toBeInstanceOf(StdoutAlertSink);
    expect(sinks[1]).toBeInstanceOf(DiscordAlertSink);
    expect(sinks[2]).toBeInstanceOf(SlackAlertSink);
  });
});

describe("validate", () => {
  it("returns ok=true when RPC reachable and accounts exist", async () => {
    const getSlot = vi.fn().mockResolvedValue(123_000);
    const getAccountInfo = vi.fn().mockResolvedValue({ data: Buffer.alloc(0) });
    const result = await validate(makeConfig(), {
      connectionFactory: () => ({ getSlot, getAccountInfo }),
      log: () => {},
    });
    expect(result.ok).toBe(true);
    expect(result.rpcReachable).toBe(true);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]?.exists).toBe(true);
    expect(result.errors).toEqual([]);
    expect(getSlot).toHaveBeenCalledOnce();
    expect(getAccountInfo).toHaveBeenCalledWith(ACCOUNT, "confirmed");
  });

  it("reports rpc unreachable when getSlot throws and skips account probes", async () => {
    const getSlot = vi.fn().mockRejectedValue(new Error("network down"));
    const getAccountInfo = vi.fn();
    const result = await validate(makeConfig(), {
      connectionFactory: () => ({ getSlot, getAccountInfo }),
      log: () => {},
    });
    expect(result.ok).toBe(false);
    expect(result.rpcReachable).toBe(false);
    expect(result.errors[0]).toMatch(/rpc unreachable/);
    expect(getAccountInfo).not.toHaveBeenCalled();
  });

  it("treats null account info as 'not yet on-chain' (still ok)", async () => {
    const getSlot = vi.fn().mockResolvedValue(1);
    const getAccountInfo = vi.fn().mockResolvedValue(null);
    const result = await validate(makeConfig(), {
      connectionFactory: () => ({ getSlot, getAccountInfo }),
      log: () => {},
    });
    expect(result.ok).toBe(true);
    expect(result.accounts[0]?.exists).toBe(false);
  });

  it("collects per-account errors when getAccountInfo throws", async () => {
    const getSlot = vi.fn().mockResolvedValue(1);
    const getAccountInfo = vi.fn().mockRejectedValue(new Error("rate limited"));
    const result = await validate(makeConfig(), {
      connectionFactory: () => ({ getSlot, getAccountInfo }),
      log: () => {},
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/rate limited/);
  });

  it("never logs the raw rpcUrl (no key leakage)", async () => {
    const lines: string[] = [];
    const getSlot = vi.fn().mockResolvedValue(1);
    const getAccountInfo = vi.fn().mockResolvedValue({ data: Buffer.alloc(0) });
    await validate(makeConfig(), {
      connectionFactory: () => ({ getSlot, getAccountInfo }),
      log: (msg) => lines.push(msg),
    });
    const all = lines.join("\n");
    expect(all).not.toContain("secret-1234");
    expect(all).not.toContain("api-key");
  });

  it("works with an empty watch list", async () => {
    const getSlot = vi.fn().mockResolvedValue(1);
    const getAccountInfo = vi.fn();
    const result = await validate(makeConfig({ watch: [] }), {
      connectionFactory: () => ({ getSlot, getAccountInfo }),
      log: () => {},
    });
    expect(result.ok).toBe(true);
    expect(result.accounts).toEqual([]);
    expect(getAccountInfo).not.toHaveBeenCalled();
  });
});
