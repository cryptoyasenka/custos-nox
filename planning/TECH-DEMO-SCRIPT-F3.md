# F3 — Technical Demo Script (2:30–2:50 min, English)
# REVISED 2026-05-07 — "show the full awesomeness"

**Recording:** OBS Studio / Loom Desktop / Win+G Game Bar (local capture), screen only (no face needed, or PiP). Upload to YouTube **Unlisted** (same channel as F2 + F1 Week 3 video 2026-04-24).
**Target:** 2:30–2:50. ~380–420 words.
**Style:** "narrate what you're doing while you do it." Start on the website, move to the terminal, land in Discord, return to the website.

---

## PRE-RECORDING SETUP (10 min)

**1. Daemon .env — set devnet + Discord + fresh accounts**

```bash
cd /c/Projects/custos
npm run smoke:create          # prints NEW_MULTISIG_PDA
npm run smoke:nonce-plan      # prints NEW_NONCE_PUBKEY, writes .smoke-nonce.json
```

Update `.env`:
```
CUSTOS_CLUSTER=devnet
CUSTOS_RPC_URL=https://api.devnet.solana.com
CUSTOS_WATCH=SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf:<NEW_PDA>,11111111111111111111111111111111:<NEW_NONCE>
CUSTOS_DISCORD_WEBHOOK=<your Discord webhook URL>
```

> ⚠️ `CUSTOS_CLUSTER=devnet` is REQUIRED — otherwise Solscan links point to mainnet.

**2. Screen layout**

- **Browser tab 1:** `https://custos-nox.up.railway.app` — open and scrolled to top, fullscreen-ready
- **Browser tab 2:** Discord channel that receives Custos Nox alerts — visible and in foreground-ready
- **Terminal 1 (attacker):** empty prompt, commands ready
- **Terminal 2 (daemon):** `npm run dev` — start it, wait until you see both subscription confirmation lines

Large dark font. Nothing else visible on screen. Switch between browser and terminals via taskbar — smooth, no fumbling.

> ⚠️ **Verify Discord works BEFORE recording:** run `npm run smoke:timelock -- <PDA>` once, check the webhook fires, then re-create a fresh multisig with `npm run smoke:create`.

---

## SCRIPT

---

### [0:00–0:20] — Open on the dashboard

*(Browser full-screen on `https://custos-nox.up.railway.app`, hero section)*

"This is Custos Nox — an open-source attack monitor for Solana multisigs and DAOs.

On April 1, 2026, $285 million was drained from Drift Protocol. It wasn't a zero-day.
The attacker spent nine days setting up on-chain — in full public view.
No tool alerted anyone."

*(glance at the stats bar: 5 detectors · 205 tests · $285M · <1s latency)*

"That changes now."

---

### [0:20–0:40] — Drift timeline

*(Scroll smoothly down to the **"How the Drift attack unfolded"** section — the 4-step timeline)*

"This is what that nine-day window looked like.

March 23: a privileged durable nonce is created — the pre-signed drain transaction is now armed.
March 26: the governance timelock is dropped to zero.
March 26: the security council multisig is weakened to two-of-five with instant execution.
April 1: the pre-signed withdrawal executes. Twelve minutes, two hundred and eighty-five million dollars gone.

Every step was on-chain. Every step is a detector in Custos Nox."

---

### [0:40–0:55] — Detector catalog

*(Scroll up slightly to the **"What it catches"** grid — 5 detector cards visible)*

"Five detectors running today.
Four map one-to-one to each step in the Drift chain.
The fifth catches an adjacent signer-rotation vector — same account-diff machinery, different attack angle.

Any single one firing would have bought the DAO days to respond."

---

### [0:55–1:10] — Transition to live demo

"Let me replay that chain right now — live on devnet."

*(Switch to two-terminal layout. Terminal 2 shows the daemon running with two subscription lines.)*

"The daemon is connected via WebSocket and has seeded baseline state for both accounts.
The very first change will be diffed correctly."

---

### [1:10–1:45] — Four live alerts — all five detectors

*(Terminal 1. Type each command, Enter. Pause 3–4 seconds for tx confirmation after each.)*

**Step 1 — timelock removal:**
`npm run smoke:timelock -- <PDA>`

"CRITICAL. Timelock dropped to zero. Solscan link, previous value, current value — instant."

**Step 2 — multisig weakening:**
`npm run smoke:weaken -- <PDA>`

"HIGH. Threshold dropped from three-of-five to one-of-five. The attacker can now sign anything alone."

**Step 3 — nonce initialization:**
`npm run smoke:nonce-init`

"CRITICAL. Nonce initialized under an attacker-controlled key. The pre-signed drain is now armed."

**Step 4 — signer rotation:**
`npm run smoke:rotate-signers -- <PDA>`

"HIGH. Legitimate signer evicted, attacker key added. That's the fifth detector — an adjacent takeover
vector that's hit other Solana protocols. Not part of the Drift chain, but the same baseline-diff
machinery catches it for free.

Four alerts. All five detectors demonstrated."

---

### [1:45–2:02] — Discord alert landing

*(Switch to the Discord channel tab — four severity-colored embeds visible)*

"All four alerts landed in Discord simultaneously — color-coded by severity, each with a direct
Solscan transaction link and the exact values that changed.

Discord, Slack, and stdout fire in parallel. One failing webhook never blocks the others."

*(Scroll to show all four embed cards. 8–10 seconds.)*

---

### [1:52–2:07] — Stale nonce / fourth detector

*(Switch back to Terminal 1)*

"The fourth detector — StaleNonceExecutionDetector — watches for the drain itself.
When a durable nonce is advanced and it was seeded more than an hour ago, it fires HIGH.
That's the moment the attacker's pre-signed transaction executes.

I can't trigger this live without waiting an hour, so —"

`npm test src/detectors/stale-nonce-execution`

*(wait for output)*

"— twelve tests, the exact Drift pattern. All green."

---

### [2:07–2:22] — Architecture

"Under the hood: TypeScript daemon, zero Rust.
WebSocket with exponential backoff, one to sixty seconds.
Baseline seeding before subscribe — so the first event is always a real diff.
Per-detector five-second timeout — a hanging detector surfaces as a low-severity operational alert instead of disappearing silently.

Two hundred and five tests. GitHub Actions CI on every push."

---

### [2:22–2:45] — Self-host CTA on the website

*(Switch back to browser, scroll to the **"Self-host in 5 minutes"** section)*

"Install is three steps: get a free Helius RPC key, point it at your multisig PDA, run npm run dev.
Or Docker one-liner if you prefer.
No vendor lock-in. No paid tiers. MIT licensed.

Alerts start arriving within a second of any config change."

*(Scroll to footer, URL visible: `github.com/cryptoyasenka/custos-nox`)*

"The code is at github.com/cryptoyasenka/custos-nox."

---

## TIMING CHECK

| Section | ~Sec |
| ------- | ---- |
| Dashboard hero | 0:20 |
| Drift timeline | 0:20 |
| Detector catalog | 0:15 |
| Transition | 0:15 |
| Four live alerts (all 5 detectors) | 0:35 |
| Discord landing (4 embeds) | 0:17 |
| Stale nonce / tests | 0:15 |
| Architecture | 0:15 |
| Self-host CTA | 0:23 |
| **Total** | **~2:55** |

---

## WHAT TO SHOW ON SCREEN (in order)

1. **Dashboard hero** — full-width browser, stats bar visible
2. **Drift timeline** — 4-step horizontal card layout (scroll into view smoothly)
3. **Detector grid** — 5 cards (2×2 + 1), production badges visible
4. **Two-terminal split** — daemon subscriptions confirmed, clean
5. **Alerts firing** — Terminal 2 receiving colored CRITICAL/HIGH output, Solscan link visible
6. **Discord channel** — 3 severity-colored embeds with Solscan links
7. **Stale nonce test output** — "12 passing" visible
8. **Self-host section** — 3-step cards + code block
9. **Footer** — GitHub URL as end frame (hold 3 sec)

---

## RECORDING TIPS

- Open the dashboard the day before to verify it loads clean on Railway
- Scroll speed on the dashboard: slow and deliberate — viewers need to read the timeline cards
- Pause 3–4 sec after each alert so the severity badge and Solscan link are readable
- Don't edit out the tx confirmation wait — it proves the chain is real
- For Discord: make sure the bot name and avatar are set (looks more professional than "Webhook")
- One take with natural pace is fine; cut silence at head/tail only
- Upload to YouTube as **Unlisted** (NOT Private — Private requires login)
- Title: `Custos Nox — F3 Tech Demo (Solana Frontier 2026)`
- End screens / cards OFF
- **Verify URL works in incognito (no login)** before pasting in Arena field A11

---

## WHY THIS STRUCTURE WORKS

The old script opened in a terminal. This opens on the website because:

1. **Dashboard = credibility signal.** Judges see a finished product in 5 seconds, not a raw CLI.
2. **Drift timeline = emotional anchor.** The 9-day visual makes the $285M number real before you touch a keyboard.
3. **Detector grid = coverage proof.** Five cards, each with its role in the chain, visible at a glance.
4. **Discord landing = production readiness.** Shows the project works for teams, not just solo devs running npm.
5. **Self-host section = accessible.** Ends with "anyone can run this," which matters for Public Goods judges.

The terminal demo in the middle proves it actually works. The website frames why anyone should care.
