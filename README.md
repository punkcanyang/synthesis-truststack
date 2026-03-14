# Synthesis TrustStack

Hackathon project for The Synthesis.

## Modules
- `apps/agent-core`: Guardrails, orchestration, reputation logic
- `packages/receipt-sdk`: Receipt model + hash-chain utilities
- `contracts`: Optional on-chain verifier or policy contracts
- `docs`: Demo script, architecture, submission notes

## Quick start
```bash
cd projects/synthesis-truststack
npm ci
npm run check
```

## AI-first policy
- See `docs/AI_FIRST_RULES.md` for maintainability rules used by human + AI reviewers.
- Live tasks are tracked in `TODO.md`.

## Branching
- `main`: always demoable
- `feat/*`, `fix/*`, `docs/*`

## MVP focus (48h)
1. Spending guardrails (limit + whitelist)
2. Receipt ledger (append-only + hash chain)
3. Submission autopilot (generate markdown pack)
4. Reputation v0 from receipts
