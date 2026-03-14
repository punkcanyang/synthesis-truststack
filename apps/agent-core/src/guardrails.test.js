import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSpendRequest } from './guardrails.js';

test('allows request when under limit and recipient is allowlisted', () => {
  const policy = { perTxLimitUsd: 100, recipientAllowlist: ['wallet:ops'] };
  const request = { requestId: 'r1', amountUsd: 42, recipient: 'wallet:ops' };

  const decision = evaluateSpendRequest(policy, request);
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'ALLOWED');
  assert.deepEqual(decision.violations, []);
});

test('blocks request when exceeding per-tx limit', () => {
  const policy = { perTxLimitUsd: 100, recipientAllowlist: ['wallet:ops'] };
  const request = { requestId: 'r2', amountUsd: 120, recipient: 'wallet:ops' };

  const decision = evaluateSpendRequest(policy, request);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'BLOCKED_LIMIT');
});

test('blocks request when recipient is not allowlisted', () => {
  const policy = { perTxLimitUsd: 100, recipientAllowlist: ['wallet:ops'] };
  const request = { requestId: 'r3', amountUsd: 80, recipient: 'wallet:unknown' };

  const decision = evaluateSpendRequest(policy, request);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'BLOCKED_RECIPIENT');
});
