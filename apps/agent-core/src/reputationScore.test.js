import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReputationV0 } from './reputationScore.js';

test('calculates stable explainable score from mixed receipt outcomes', () => {
  const receipts = [
    { status: 'executed', reason: 'ALLOWED' },
    { status: 'executed', reason: 'ALLOWED' },
    { status: 'blocked', reason: 'BLOCKED_LIMIT' }
  ];

  const report = calculateReputationV0(receipts);

  assert.equal(report.metrics.executedCount, 2);
  assert.equal(report.metrics.blockedCount, 1);
  assert.equal(report.metrics.policyBlockedCount, 1);
  assert.equal(report.breakdown.finalScore, 64);
});

test('clamps high reputation score at 100', () => {
  const receipts = [];
  for (let i = 0; i < 20; i += 1) {
    receipts.push({ status: 'executed', reason: 'ALLOWED' });
  }

  const report = calculateReputationV0(receipts);
  assert.equal(report.breakdown.finalScore, 100);
});

test('throws for invalid receipt status', () => {
  assert.throws(
    () => calculateReputationV0([{ status: 'unknown', reason: 'x' }]),
    /invalid status/
  );
});
