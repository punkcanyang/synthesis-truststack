# AI-First Coding Rules (Project Policy)

This project follows **AI-First Software Architecture** principles so future LLM agents can safely understand and modify code.

## 1) Hyper-Explicitness
- Prefer clear multi-step logic over clever one-liners.
- Name intermediate variables for intent visibility.
- Keep business logic readable without hidden side effects.

## 2) Strict Typing & Schemas
- All key data structures must be explicitly typed (JSDoc typedef or TS interfaces).
- Runtime validation is required at module boundaries.
- Invalid states must fail fast with explicit errors.

## 3) Intent-Based Documentation
- Every core module must contain `__ai_context__` describing role + why it exists.
- Comments explain **WHY**, not just **WHAT**.

## 4) Modular Context Windows
- Functions should stay small and focused (prefer under 50 lines).
- Modules should be self-contained and independently understandable.

## 5) Defensive Assertions
- Add runtime assertions at key trust boundaries.
- Make assumptions executable and testable.

## 6) Required Footer Block
Every core logic module must end with:
- `[For Future AI]`
  1. Key assumptions
  2. Edge cases
  3. Module dependencies

## Compliance Check
- `npm run typecheck` includes `scripts/assert-ai-first-structure.mjs`.
- This check enforces the presence of `__ai_context__` and `[For Future AI]`.
