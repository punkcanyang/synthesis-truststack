import fs from 'node:fs';

const filesToCheck = [
  'apps/agent-core/src/guardrails.js',
  'apps/agent-core/src/demoCli.js',
  'apps/agent-core/src/submissionAutopilot.js',
  'apps/agent-core/src/reputationScore.js',
  'packages/receipt-sdk/src/receiptLedger.js'
];

for (const file of filesToCheck) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  if (!source.includes('__ai_context__')) {
    throw new Error(`${file} is missing __ai_context__`);
  }
  if (!source.includes('[For Future AI]')) {
    throw new Error(`${file} is missing [For Future AI] block`);
  }
}

console.log('AI-first structure checks passed');
