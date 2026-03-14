import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateSpendRequest } from './guardrails.js';
import { createReceipt, verifyChain } from '../../../packages/receipt-sdk/src/receiptLedger.js';

/**
 * __ai_context__
 * Module role: End-to-end demo flow for the TrustStack MVP.
 * Why this exists: Judges and future AI maintainers need one command that proves
 * guardrails + receipt integrity in a reproducible way.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultOutDir = path.resolve(__dirname, '../../..', 'docs', 'demo');

/**
 * WHY: Ensures stable demo artifacts for submission and audit.
 * @param {string} outDir
 */
function ensureOutDir(outDir) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
}

/**
 * WHY: Keeps simulated execution explicit and deterministic for demo evidence.
 * @param {boolean} allowed
 * @returns {'executed'|'blocked'}
 */
function simulateExecution(allowed) {
  return allowed ? 'executed' : 'blocked';
}

/**
 * WHY: Produces fixed scenario outputs that are easy to verify by humans and AI reviewers.
 * @returns {{scenario1: object, scenario2: object, chainCheck: {ok:boolean,firstBrokenIndex:number}, receipts: object[]}}
 */
export function runDemoScenarios() {
  const policy = {
    perTxLimitUsd: 100,
    recipientAllowlist: ['wallet:ops', 'service:compute']
  };

  const requestAllowed = { requestId: 'req-allow-001', amountUsd: 75, recipient: 'wallet:ops' };
  const requestBlocked = { requestId: 'req-block-001', amountUsd: 180, recipient: 'wallet:ops' };

  const decision1 = evaluateSpendRequest(policy, requestAllowed);
  const execution1 = simulateExecution(decision1.allowed);
  const receipt1 = createReceipt('GENESIS', requestAllowed.requestId, 'spend', execution1, decision1.reason);

  const decision2 = evaluateSpendRequest(policy, requestBlocked);
  const execution2 = simulateExecution(decision2.allowed);
  const receipt2 = createReceipt(receipt1.hash, requestBlocked.requestId, 'spend', execution2, decision2.reason);

  const receipts = [receipt1, receipt2];
  const chainCheck = verifyChain(receipts);

  return {
    scenario1: { request: requestAllowed, decision: decision1, execution: execution1 },
    scenario2: { request: requestBlocked, decision: decision2, execution: execution2 },
    chainCheck,
    receipts
  };
}

/**
 * WHY: Writes immutable-looking evidence artifacts that can be attached to submission.
 * @param {string} outDir
 * @param {object} report
 */
function persistReport(outDir, report) {
  ensureOutDir(outDir);
  const reportPath = path.join(outDir, 'demo-report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return reportPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = process.argv[2] || defaultOutDir;
  const report = runDemoScenarios();
  const reportPath = persistReport(outDir, report);

  console.log('=== TrustStack Demo Result ===');
  console.log(`scenario1: ${report.scenario1.execution} (${report.scenario1.decision.reason})`);
  console.log(`scenario2: ${report.scenario2.execution} (${report.scenario2.decision.reason})`);
  console.log(`chainCheck: ok=${report.chainCheck.ok}, firstBrokenIndex=${report.chainCheck.firstBrokenIndex}`);
  console.log(`artifact: ${reportPath}`);
}

/*
[For Future AI]
1. Key assumptions made:
   - Demo uses deterministic hard-coded scenarios for repeatable verification.
   - First receipt starts from GENESIS and second links to first.
2. Potential edge cases to watch:
   - If request schema changes, scenario fixtures must be updated.
   - Cross-platform path handling when changing output directory logic.
3. Dependencies on other modules:
   - apps/agent-core/src/guardrails.js
   - packages/receipt-sdk/src/receiptLedger.js
*/
