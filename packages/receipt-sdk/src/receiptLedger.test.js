import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceipt, computeReceiptRoot, verifyChain } from './receiptLedger.js';

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

// WHY: 空链应合法通过校验
test('verifyChain returns ok for empty receipts array', () => {
  const result = verifyChain([]);
  assert.equal(result.ok, true);
  assert.equal(result.firstBrokenIndex, -1);
});

// WHY: 单条记录链也应正确校验
test('verifyChain validates single receipt chain', () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  const result = verifyChain([r1]);
  assert.equal(result.ok, true);
  assert.equal(result.firstBrokenIndex, -1);
});

// WHY: 首条收据的 prevHash 不是 GENESIS 应被检测为异常
test('verifyChain rejects chain whose first receipt prevHash is not GENESIS', () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  r1.prevHash = 'not-genesis';

  const result = verifyChain([r1]);
  assert.equal(result.ok, false);
  assert.equal(result.firstBrokenIndex, 0);
});

// WHY: 无效 status 应快速失败
test('createReceipt throws on invalid status', () => {
  assert.throws(
    () => createReceipt('GENESIS', 'r1', 'spend', 'invalid-status', 'reason'),
    /status is invalid/
  );
});

// WHY: 缺少必要字段应快速失败
test('createReceipt throws on empty id', () => {
  assert.throws(
    () => createReceipt('GENESIS', '', 'spend', 'allowed', 'reason'),
    /id must be a non-empty string/
  );
});

// WHY: 非数组输入应快速失败
test('verifyChain throws on non-array input', () => {
  assert.throws(() => verifyChain('not-an-array'), /receipts must be an array/);
});

// WHY: v1 root 直接使用末条收据 hash，供链上锚定使用
test('computeReceiptRoot returns last receipt hash for a valid chain', () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  const r2 = createReceipt(r1.hash, 'r2', 'spend', 'executed', 'tx submitted');
  const root = computeReceiptRoot([r1, r2]);
  assert.equal(root, r2.hash);
});

// WHY: 空链在 v1 语义下返回 GENESIS，便于锚定脚本一致处理
test('computeReceiptRoot returns GENESIS for empty chain', () => {
  const root = computeReceiptRoot([]);
  assert.equal(root, 'GENESIS');
});

// WHY: 锚定前必须拒绝损坏链，避免把错误证据写入链上
test('computeReceiptRoot throws when chain is invalid', () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  const r2 = createReceipt(r1.hash, 'r2', 'spend', 'executed', 'tx submitted');
  r2.reason = 'tampered';

  assert.throws(() => computeReceiptRoot([r1, r2]), /invalid receipt chain/);
});
