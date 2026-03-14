import test from 'node:test';
import assert from 'node:assert/strict';
import { runDemoScenarios } from './demoCli.js';

test('demo scenarios produce one executed and one blocked flow with valid chain', () => {
  const report = runDemoScenarios();

  assert.equal(report.scenario1.execution, 'executed');
  assert.equal(report.scenario1.decision.reason, 'ALLOWED');

  assert.equal(report.scenario2.execution, 'blocked');
  assert.equal(report.scenario2.decision.reason, 'BLOCKED_LIMIT');

  assert.equal(report.chainCheck.ok, true);
  assert.equal(report.chainCheck.firstBrokenIndex, -1);
  assert.equal(report.receipts.length, 2);
});
