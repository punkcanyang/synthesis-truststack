# Architecture v0

## Flow
1. User/agent proposes action.
2. Guardrail engine validates policy.
3. Executor simulates/executes action.
4. Receipt ledger writes immutable record (hash-linked).
5. Reputation service updates score.
6. Submission autopilot compiles artifacts.
