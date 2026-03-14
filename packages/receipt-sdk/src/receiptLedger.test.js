import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceipt, verifyChain } from './receiptLedger.js';

test('creates hash-linked receipts and verifies chain', () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  const r2 = createReceipt(r1.hash, 'r2', 'spend', 'executed', 'tx submitted');

  const result = verifyChain([r1, r2]);
  assert.equal(result.ok, true);
  assert.equal(result.firstBrokenIndex, -1);
});

test('detects tampering in receipt chain', () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  const r2 = createReceipt(r1.hash, 'r2', 'spend', 'executed', 'tx submitted');
  r2.reason = 'tampered';

  const result = verifyChain([r1, r2]);
  assert.equal(result.ok, false);
  assert.equal(result.firstBrokenIndex, 1);
});
