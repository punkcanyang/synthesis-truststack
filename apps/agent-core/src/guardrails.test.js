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

// WHY: 验证双重违规场景返回 BLOCKED_MULTIPLE 而非只报第一个
test('returns BLOCKED_MULTIPLE when both limit and recipient are violated', () => {
  const policy = { perTxLimitUsd: 100, recipientAllowlist: ['wallet:ops'] };
  const request = { requestId: 'r4', amountUsd: 200, recipient: 'wallet:unknown' };

  const decision = evaluateSpendRequest(policy, request);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'BLOCKED_MULTIPLE');
  assert.equal(decision.violations.length, 2);
});

// WHY: 边界精确值应被允许通过
test('allows request when amount equals exactly the limit', () => {
  const policy = { perTxLimitUsd: 100, recipientAllowlist: ['wallet:ops'] };
  const request = { requestId: 'r5', amountUsd: 100, recipient: 'wallet:ops' };

  const decision = evaluateSpendRequest(policy, request);
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'ALLOWED');
});

// WHY: 零金额应是合法请求
test('allows request with zero amount', () => {
  const policy = { perTxLimitUsd: 100, recipientAllowlist: ['wallet:ops'] };
  const request = { requestId: 'r6', amountUsd: 0, recipient: 'wallet:ops' };

  const decision = evaluateSpendRequest(policy, request);
  assert.equal(decision.allowed, true);
});

// WHY: 无效输入应快速失败
test('throws on invalid policy input', () => {
  assert.throws(() => evaluateSpendRequest(null, { requestId: 'r7', amountUsd: 10, recipient: 'x' }));
  assert.throws(() => evaluateSpendRequest({ perTxLimitUsd: 'bad', recipientAllowlist: [] }, { requestId: 'r8', amountUsd: 10, recipient: 'x' }));
});

test('throws on invalid request input', () => {
  const policy = { perTxLimitUsd: 100, recipientAllowlist: ['wallet:ops'] };
  assert.throws(() => evaluateSpendRequest(policy, null));
  assert.throws(() => evaluateSpendRequest(policy, { requestId: '', amountUsd: 10, recipient: 'x' }));
  assert.throws(() => evaluateSpendRequest(policy, { requestId: 'r9', amountUsd: NaN, recipient: 'x' }));
});
