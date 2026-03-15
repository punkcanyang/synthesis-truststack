import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * __ai_context__
 * Module role: Generate submission-ready markdown artifacts from current project state.
 * Why this exists: Hackathon delivery fails when final packaging is manual and inconsistent.
 * This module makes submission output reproducible for both humans and future AI agents.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultBundleDir = path.resolve(__dirname, '../../..', 'docs', 'submission-bundle');
const defaultDemoReportPath = path.resolve(__dirname, '../../..', 'docs', 'demo', 'demo-report.json');

/**
 * WHY: Validating input paths early avoids silent partial bundle generation.
 * @param {string} demoReportPath
 */
function assertDemoReportExists(demoReportPath) {
  if (!fs.existsSync(demoReportPath)) {
    throw new Error(`Demo report not found at: ${demoReportPath}`);
  }
}

/**
 * WHY: Ensures all bundle outputs are co-located and easy to attach during submission.
 * @param {string} bundleDir
 */
function ensureBundleDir(bundleDir) {
  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }
}

/**
 * WHY: Demo evidence should flow into summary docs so reviewers can verify claims quickly.
 * @param {any} demoReport
 */
function buildReadmeSubmission(demoReport) {
  return `# TrustStack Submission Summary\n\n## Problem\nWe need trustworthy agent execution: enforce spending guardrails, produce verifiable receipts, and package outputs quickly.\n\n## What We Built\n- Spending Guardrails (per-tx limit + allowlist)\n- Receipt Ledger (hash-linked append-only receipts)\n- End-to-end demo flow (request -> guard -> simulated execution -> receipt)\n\n## Demo Evidence\n- Scenario 1: ${demoReport.scenario1.execution} (${demoReport.scenario1.decision.reason})\n- Scenario 2: ${demoReport.scenario2.execution} (${demoReport.scenario2.decision.reason})\n- Chain integrity: ok=${demoReport.chainCheck.ok}, firstBrokenIndex=${demoReport.chainCheck.firstBrokenIndex}\n\n## Artifacts\n- docs/demo/demo-report.json\n- docs/submission-bundle/README_SUBMISSION.md\n- docs/submission-bundle/DEMO_SCRIPT.md\n- docs/submission-bundle/CHANGELOG.md\n`;
}

/**
 * WHY: A scripted demo keeps judging reproducible and avoids ad-hoc presenter mistakes.
 * @returns {string}
 */
function buildDemoScript() {
  return `# Demo Script (2-3 minutes)\n\n1. Run checks:\n   - npm run check\n2. Run end-to-end flow:\n   - npm run demo\n3. Open artifact:\n   - docs/demo/demo-report.json\n4. Explain trust guarantees:\n   - Guardrails block out-of-policy actions\n   - Receipt hashes make tampering detectable\n`;
}

/**
 * WHY: Changelog provides reviewers a compact timeline of shipped capabilities.
 * @returns {string}
 */
function buildChangelog() {
  return `# Changelog\n\n## v0.1\n- Scaffolded project with CI and AI-first policy\n- Implemented spending guardrails with tests\n- Implemented receipt ledger with tamper-detection tests\n- Added end-to-end demo CLI and generated demo artifact\n- Added submission autopilot generator\n`;
}

/**
 * WHY: One pure function makes bundle generation testable and deterministic.
 * @param {string} demoReportPath
 * @param {string} bundleDir
 */
export function generateSubmissionBundle(demoReportPath = defaultDemoReportPath, bundleDir = defaultBundleDir) {
  assertDemoReportExists(demoReportPath);
  ensureBundleDir(bundleDir);

  const demoReportRaw = fs.readFileSync(demoReportPath, 'utf8');
  const demoReport = JSON.parse(demoReportRaw);

  const readmePath = path.join(bundleDir, 'README_SUBMISSION.md');
  const scriptPath = path.join(bundleDir, 'DEMO_SCRIPT.md');
  const changelogPath = path.join(bundleDir, 'CHANGELOG.md');

  fs.writeFileSync(readmePath, `${buildReadmeSubmission(demoReport)}\n`, 'utf8');
  fs.writeFileSync(scriptPath, `${buildDemoScript()}\n`, 'utf8');
  fs.writeFileSync(changelogPath, `${buildChangelog()}\n`, 'utf8');

  return { readmePath, scriptPath, changelogPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const demoReportPath = process.argv[2] || defaultDemoReportPath;
  const bundleDir = process.argv[3] || defaultBundleDir;
  const out = generateSubmissionBundle(demoReportPath, bundleDir);

  console.log('=== Submission Bundle Generated ===');
  console.log(`README: ${out.readmePath}`);
  console.log(`DEMO_SCRIPT: ${out.scriptPath}`);
  console.log(`CHANGELOG: ${out.changelogPath}`);
}

/*
[For Future AI]
1. Key assumptions made:
   - demo-report.json exists and includes scenario1/scenario2/chainCheck fields.
   - Markdown bundle format is acceptable for submission and review.
2. Potential edge cases to watch:
   - Missing or schema-changed demo report fields should be handled with stronger validation.
   - If submission platform requires JSON payloads, add an adapter module instead of changing markdown outputs directly.
3. Dependencies on other modules:
   - docs/demo/demo-report.json produced by apps/agent-core/src/demoCli.js.
*/
