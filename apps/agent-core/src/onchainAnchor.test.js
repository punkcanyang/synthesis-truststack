import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createReceipt } from '@truststack/receipt-sdk';
import {
  anchorRootFromDemoReport,
  buildAnchorData,
  computeRootFromDemoReportPath,
  extractRootFromAnchorData,
  verifyAnchoredRoot
} from './onchainAnchor.js';

function createDemoReportFile(receipts) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'truststack-anchor-'));
  const demoReportPath = path.join(tempDir, 'demo-report.json');
  fs.writeFileSync(demoReportPath, JSON.stringify({ receipts }, null, 2), 'utf8');
  return demoReportPath;
}

test('buildAnchorData and extractRootFromAnchorData roundtrip correctly', () => {
  const root = '8f7b7d85c95f2d64f4f7deaa2d5ef4c6262f5fa01073a68ad3124f5ee4f90c11';
  const data = buildAnchorData(root);
  const extracted = extractRootFromAnchorData(data);

  assert.match(data, /^0x[0-9a-f]+$/);
  assert.equal(extracted, root);
});

test('computeRootFromDemoReportPath returns v1 root from report receipts', () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  const r2 = createReceipt(r1.hash, 'r2', 'spend', 'executed', 'tx submitted');
  const demoReportPath = createDemoReportFile([r1, r2]);
  const root = computeRootFromDemoReportPath(demoReportPath);
  assert.equal(root, r2.hash);
});

test('anchorRootFromDemoReport sends transaction with anchored root payload', async () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  const r2 = createReceipt(r1.hash, 'r2', 'spend', 'executed', 'tx submitted');
  const demoReportPath = createDemoReportFile([r1, r2]);
  const calls = [];

  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);

    if (body.method === 'eth_chainId') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result: '0xaa36a7' }) };
    }
    if (body.method === 'eth_sendTransaction') {
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result: '0xabc123' }) };
    }
    if (body.method === 'eth_getTransactionReceipt') {
      const pollCount = calls.filter(call => call.method === 'eth_getTransactionReceipt').length;
      const result = pollCount < 2 ? null : { transactionHash: '0xabc123', blockNumber: '0x20' };
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result }) };
    }
    throw new Error(`Unexpected RPC method: ${body.method}`);
  };

  const result = await anchorRootFromDemoReport({
    demoReportPath,
    rpcUrl: 'https://rpc.example',
    from: '0x1111111111111111111111111111111111111111',
    fetchImpl,
    pollIntervalMs: 0,
    timeoutMs: 1000
  });

  assert.equal(result.root, r2.hash);
  assert.equal(result.txHash, '0xabc123');
  assert.equal(result.blockNumber, '0x20');

  const sendTxPayload = calls.find(call => call.method === 'eth_sendTransaction');
  assert.equal(sendTxPayload.params[0].data, buildAnchorData(r2.hash));
});

test('anchorRootFromDemoReport rejects anchoring an empty receipt chain', async () => {
  const demoReportPath = createDemoReportFile([]);

  await assert.rejects(
    () => anchorRootFromDemoReport({
      demoReportPath,
      rpcUrl: 'https://rpc.example',
      from: '0x1111111111111111111111111111111111111111',
      fetchImpl: async () => ({ ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x1' }) })
    }),
    /cannot anchor empty receipt chain/
  );
});

test('verifyAnchoredRoot compares local root against tx payload', async () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  const r2 = createReceipt(r1.hash, 'r2', 'spend', 'executed', 'tx submitted');
  const demoReportPath = createDemoReportFile([r1, r2]);

  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    if (body.method !== 'eth_getTransactionByHash') {
      throw new Error(`Unexpected RPC method: ${body.method}`);
    }
    return {
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          hash: '0xabc123',
          blockNumber: '0x20',
          input: buildAnchorData(r2.hash)
        }
      })
    };
  };

  const result = await verifyAnchoredRoot({
    demoReportPath,
    rpcUrl: 'https://rpc.example',
    txHash: '0xabc123',
    fetchImpl
  });

  assert.equal(result.ok, true);
  assert.equal(result.expectedRoot, r2.hash);
  assert.equal(result.anchoredRoot, r2.hash);
});

test('verifyAnchoredRoot returns mismatch when tx payload has different root', async () => {
  const r1 = createReceipt('GENESIS', 'r1', 'spend', 'allowed', 'policy passed');
  const r2 = createReceipt(r1.hash, 'r2', 'spend', 'executed', 'tx submitted');
  const demoReportPath = createDemoReportFile([r1, r2]);
  const wrongRoot = 'f'.repeat(64);

  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          hash: '0xabc123',
          blockNumber: '0x21',
          input: buildAnchorData(wrongRoot)
        }
      })
    };
  };

  const result = await verifyAnchoredRoot({
    demoReportPath,
    rpcUrl: 'https://rpc.example',
    txHash: '0xabc123',
    fetchImpl
  });

  assert.equal(result.ok, false);
  assert.equal(result.expectedRoot, r2.hash);
  assert.equal(result.anchoredRoot, wrongRoot);
});
