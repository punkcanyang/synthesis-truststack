import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateSubmissionBundle } from './submissionAutopilot.js';

test('generates submission bundle files from demo report', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'truststack-bundle-'));
  const demoReportPath = path.join(tempDir, 'demo-report.json');
  const bundleDir = path.join(tempDir, 'bundle');

  const demoReport = {
    scenario1: { execution: 'executed', decision: { reason: 'ALLOWED' } },
    scenario2: { execution: 'blocked', decision: { reason: 'BLOCKED_LIMIT' } },
    chainCheck: { ok: true, firstBrokenIndex: -1 }
  };

  fs.writeFileSync(demoReportPath, JSON.stringify(demoReport, null, 2), 'utf8');

  const out = generateSubmissionBundle(demoReportPath, bundleDir);

  assert.equal(fs.existsSync(out.readmePath), true);
  assert.equal(fs.existsSync(out.scriptPath), true);
  assert.equal(fs.existsSync(out.changelogPath), true);

  const readmeText = fs.readFileSync(out.readmePath, 'utf8');
  assert.match(readmeText, /Scenario 1: executed/);
  assert.match(readmeText, /Chain integrity: ok=true/);
});
