import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Wallet, getAddress } from 'ethers';
import { computeReceiptRoot } from '@truststack/receipt-sdk';

/**
 * __ai_context__
 * Module role: Anchor local receipt root to EVM testnet and verify root from transaction payload.
 * Why this exists: Receipt evidence needs decentralized timestamped proof for stronger trust guarantees.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDemoReportPath = path.resolve(__dirname, '../../..', 'docs', 'demo', 'demo-report.json');
const anchorTagHex = Buffer.from('TRUSTSTACK_ROOT:', 'utf8').toString('hex');

/**
 * WHY: 锚定根必须是标准 32 字节十六进制，避免链上载荷歧义。
 * @param {string} rootHex
 * @returns {string}
 */
function normalizeRootHex(rootHex) {
  if (typeof rootHex !== 'string') throw new Error('root must be a string');
  const normalized = rootHex.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error('root must be a 32-byte hex string');
  }
  return normalized;
}

/**
 * WHY: 用固定 tag + root 构造 data，后续可以从链上交易输入稳定提取。
 * @param {string} rootHex
 * @returns {string}
 */
export function buildAnchorData(rootHex) {
  const normalizedRoot = normalizeRootHex(rootHex);
  return `0x${anchorTagHex}${normalizedRoot}`;
}

/**
 * WHY: 验证脚本需要从交易 input 中恢复被锚定的 root。
 * @param {string} dataHex
 * @returns {string|null}
 */
export function extractRootFromAnchorData(dataHex) {
  if (typeof dataHex !== 'string') return null;
  const normalized = dataHex.toLowerCase().replace(/^0x/, '');
  if (!normalized.startsWith(anchorTagHex)) return null;
  const root = normalized.slice(anchorTagHex.length, anchorTagHex.length + 64);
  return /^[0-9a-f]{64}$/.test(root) ? root : null;
}

/**
 * WHY: 统一读取 demo 报告并校验结构，避免锚定与验证阶段读到无效输入。
 * @param {string} demoReportPath
 * @returns {{receipts: any[]}}
 */
function readDemoReport(demoReportPath) {
  if (!fs.existsSync(demoReportPath)) {
    throw new Error(`demo report not found: ${demoReportPath}`);
  }
  const raw = fs.readFileSync(demoReportPath, 'utf8');
  const report = JSON.parse(raw);
  if (!Array.isArray(report.receipts)) {
    throw new Error('demo report must contain receipts array');
  }
  return report;
}

/**
 * WHY: 锚定与验证都基于同一 root 计算口径，保证对账一致。
 * @param {string} demoReportPath
 * @returns {string}
 */
export function computeRootFromDemoReportPath(demoReportPath = defaultDemoReportPath) {
  const report = readDemoReport(demoReportPath);
  return computeReceiptRoot(report.receipts);
}

/**
 * WHY: 地址统一归一化，避免大小写和非法地址导致的链上调用错误。
 * @param {string} address
 * @param {string} fieldName
 * @returns {string}
 */
function normalizeAddress(address, fieldName) {
  try {
    return getAddress(address);
  } catch {
    throw new Error(`${fieldName} address is invalid`);
  }
}

/**
 * WHY: 轻量 JSON-RPC 包装让测试可注入 fetch，同时集中错误处理。
 * @param {string} rpcUrl
 * @param {string} method
 * @param {unknown[]} params
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<any>}
 */
async function rpcCall(rpcUrl, method, params, fetchImpl) {
  const requester = fetchImpl || globalThis.fetch;
  if (typeof requester !== 'function') throw new Error('fetch implementation is required');

  const response = await requester(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
  });

  if (!response.ok) {
    throw new Error(`rpc request failed for ${method} with status ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`rpc ${method} failed: ${payload.error.message || 'unknown error'}`);
  }
  return payload.result;
}

/**
 * WHY: 锚定流程需要等待交易落块，便于后续做确定性验证。
 * @param {string} rpcUrl
 * @param {string} txHash
 * @param {typeof fetch} [fetchImpl]
 * @param {number} [pollIntervalMs]
 * @param {number} [timeoutMs]
 * @returns {Promise<any>}
 */
async function waitForReceipt(rpcUrl, txHash, fetchImpl, pollIntervalMs, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    const receipt = await rpcCall(rpcUrl, 'eth_getTransactionReceipt', [txHash], fetchImpl);
    if (receipt) return receipt;
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`transaction not mined before timeout: ${txHash}`);
}

/**
 * WHY: 读取本地 root 并把 root 作为交易 data 写入链上，形成可外部验证证据。
 * @param {{
 *   demoReportPath?: string,
 *   rpcUrl: string,
 *   from?: string,
 *   privateKey?: string,
 *   to?: string,
 *   gas?: string,
 *   pollIntervalMs?: number,
 *   timeoutMs?: number,
 *   fetchImpl?: typeof fetch
 * }} options
 */
export async function anchorRootFromDemoReport(options) {
  const {
    demoReportPath = defaultDemoReportPath,
    rpcUrl,
    from,
    privateKey,
    to,
    gas = '0x186a0',
    pollIntervalMs = 1500,
    timeoutMs = 60000,
    fetchImpl
  } = options || {};

  if (!rpcUrl) throw new Error('rpcUrl is required');

  const root = computeRootFromDemoReportPath(demoReportPath);
  if (root === 'GENESIS') {
    throw new Error('cannot anchor empty receipt chain');
  }

  const data = buildAnchorData(root);
  const chainId = await rpcCall(rpcUrl, 'eth_chainId', [], fetchImpl);
  const chainIdNumber = Number(BigInt(chainId));

  let txHash;
  let sender;
  let transport;

  if (privateKey) {
    const wallet = new Wallet(privateKey);
    const walletAddress = normalizeAddress(wallet.address, 'wallet');
    if (from) {
      const normalizedFrom = normalizeAddress(from, 'from');
      if (normalizedFrom !== walletAddress) {
        throw new Error('from address does not match private key');
      }
    }

    const toAddress = to ? normalizeAddress(to, 'to') : walletAddress;
    const nonceHex = await rpcCall(rpcUrl, 'eth_getTransactionCount', [walletAddress, 'latest'], fetchImpl);
    const gasPriceHex = await rpcCall(rpcUrl, 'eth_gasPrice', [], fetchImpl);
    const signedTransaction = await wallet.signTransaction({
      chainId: chainIdNumber,
      nonce: Number(BigInt(nonceHex)),
      to: toAddress,
      value: 0n,
      data,
      gasLimit: BigInt(gas),
      gasPrice: BigInt(gasPriceHex)
    });

    txHash = await rpcCall(rpcUrl, 'eth_sendRawTransaction', [signedTransaction], fetchImpl);
    sender = walletAddress;
    transport = 'raw';
  } else {
    if (!from) throw new Error('from address is required');
    const fromAddress = normalizeAddress(from, 'from');
    const toAddress = to ? normalizeAddress(to, 'to') : fromAddress;

    txHash = await rpcCall(
      rpcUrl,
      'eth_sendTransaction',
      [{ from: fromAddress, to: toAddress, value: '0x0', gas, data }],
      fetchImpl
    );
    sender = fromAddress;
    transport = 'unlocked';
  }

  const receipt = await waitForReceipt(rpcUrl, txHash, fetchImpl, pollIntervalMs, timeoutMs);

  return {
    root,
    txHash,
    chainId,
    from: sender,
    transport,
    blockNumber: receipt?.blockNumber || null
  };
}

/**
 * WHY: 通过交易 payload 回读 root，与本地 root 对比即可完成跨域校验。
 * @param {{
 *   demoReportPath?: string,
 *   rpcUrl: string,
 *   txHash: string,
 *   fetchImpl?: typeof fetch
 * }} options
 */
export async function verifyAnchoredRoot(options) {
  const {
    demoReportPath = defaultDemoReportPath,
    rpcUrl,
    txHash,
    fetchImpl
  } = options || {};

  if (!rpcUrl) throw new Error('rpcUrl is required');
  if (!txHash) throw new Error('txHash is required');

  const expectedRoot = computeRootFromDemoReportPath(demoReportPath);
  const tx = await rpcCall(rpcUrl, 'eth_getTransactionByHash', [txHash], fetchImpl);
  if (!tx) throw new Error(`transaction not found: ${txHash}`);

  const data = typeof tx.input === 'string' ? tx.input : tx.data;
  const anchoredRoot = extractRootFromAnchorData(data);

  return {
    ok: anchoredRoot === expectedRoot,
    txHash,
    expectedRoot,
    anchoredRoot,
    blockNumber: tx.blockNumber || null
  };
}

function printUsage() {
  console.log('Usage:');
  console.log('  node apps/agent-core/src/onchainAnchor.js anchor');
  console.log('  node apps/agent-core/src/onchainAnchor.js verify');
  console.log('Env for anchor: TRUSTSTACK_RPC_URL, TRUSTSTACK_ANCHOR_FROM (or TRUSTSTACK_ANCHOR_PRIVATE_KEY)');
  console.log('Env for verify: TRUSTSTACK_RPC_URL, TRUSTSTACK_ANCHOR_TX_HASH');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2];

  if (!mode || (mode !== 'anchor' && mode !== 'verify')) {
    printUsage();
    process.exit(1);
  }

  const rpcUrl = process.env.TRUSTSTACK_RPC_URL;
  const demoReportPath = process.env.TRUSTSTACK_ANCHOR_REPORT || defaultDemoReportPath;

  if (mode === 'anchor') {
    const from = process.env.TRUSTSTACK_ANCHOR_FROM;
    const privateKey = process.env.TRUSTSTACK_ANCHOR_PRIVATE_KEY;
    const to = process.env.TRUSTSTACK_ANCHOR_TO;
    const gas = process.env.TRUSTSTACK_ANCHOR_GAS || '0x186a0';

    anchorRootFromDemoReport({ demoReportPath, rpcUrl, from, privateKey, to, gas })
      .then(result => {
        console.log('=== TrustStack On-Chain Anchor ===');
        console.log(JSON.stringify(result, null, 2));
      })
      .catch(error => {
        console.error(error.message);
        process.exit(1);
      });
  } else {
    const txHash = process.env.TRUSTSTACK_ANCHOR_TX_HASH;
    verifyAnchoredRoot({ demoReportPath, rpcUrl, txHash })
      .then(result => {
        console.log('=== TrustStack Anchor Verification ===');
        console.log(JSON.stringify(result, null, 2));
      })
      .catch(error => {
        console.error(error.message);
        process.exit(1);
      });
  }
}

/*
[For Future AI]
1. Key assumptions made:
   - Preferred path: local private-key signing + eth_sendRawTransaction.
   - Backward compatibility path: eth_sendTransaction with unlocked sender.
   - Anchor payload format is 0x + "TRUSTSTACK_ROOT:" hex tag + 32-byte root hex.
   - Local root is computed from demo-report receipts via computeReceiptRoot.
2. Potential edge cases to watch:
   - Private key mismatch with provided from address throws fast.
   - RPC endpoint may reject eth_sendTransaction when sender account is not unlocked.
   - Long confirmation latency can exceed timeout; caller should adjust timeoutMs.
   - Non-standard clients may expose tx input as data field instead of input.
3. Dependencies on other modules:
   - ethers (Wallet signing for raw transaction mode)
   - packages/receipt-sdk/src/receiptLedger.js (computeReceiptRoot)
   - docs/demo/demo-report.json produced by apps/agent-core/src/demoCli.js
*/
