# TODO (Execution-Oriented)

## P0 - Core demo (must-have)
- [x] Implement Spending Guardrails module with explicit policy checks.
- [x] Implement Receipt Ledger module with hash-chain receipts.
- [x] Add executable tests for guardrail decisions and chain tamper detection.
- [x] Build end-to-end CLI flow: request -> guard -> execute(simulated) -> receipt output.

## P1 - Submission readiness
- [x] Implement Submission Autopilot generator (README/demo/changelog bundle).
- [x] Add one-command demo script (`npm run demo`).
- [x] Produce demo transcript artifact under `docs/demo/`.

## P2 - Reputation Passport
- [ ] Define reputation score inputs from receipt history.
- [ ] Implement v0 score calculator with explainable factors.
- [ ] Add tests for score stability and edge cases.

## P3 - Optional on-chain extension
- [ ] Anchor receipt root hash on-chain (testnet).
- [ ] Add verifier script for anchored root vs local receipts.
