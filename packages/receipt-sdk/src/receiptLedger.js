import crypto from 'node:crypto';

/**
 * __ai_context__
 * Module role: Create append-only, hash-linked receipts for every guard/execution decision.
 * Why this exists: Auditable history is required for trust, reputation, and submission evidence.
 *
 * Status contract:
 *   - 'allowed': guardrail approved the action (pre-execution)
 *   - 'blocked': guardrail denied the action, or execution was prevented
 *   - 'executed': action was successfully executed
 * Callers (e.g. demoCli) map their own execution outcomes to these three values.
 */

/**
 * @typedef {Object} ReceiptRecord
 * @property {string} id
 * @property {string} ts
 * @property {string} action
 * @property {'allowed'|'blocked'|'executed'} status
 * @property {string} reason
 * @property {string} prevHash
 * @property {string} hash
 */

/**
 * WHY: Stable serialization ensures the same logical record always produces the same hash.
 * @param {object} data
 * @returns {string}
 */
function stableStringify(data) {
  // WHY: 递归排序确保嵌套对象也能产生稳定的序列化结果
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    return '[' + data.map(item => stableStringify(item)).join(',') + ']';
  }
  const ordered = Object.keys(data).sort().reduce((acc, key) => {
    acc[key] = data[key];
    return acc;
  }, {});
  return '{' + Object.keys(ordered).map(key =>
    JSON.stringify(key) + ':' + stableStringify(ordered[key])
  ).join(',') + '}';
}

/**
 * WHY: Hash chaining makes tampering detectable without external databases.
 * @param {object} payload
 * @param {string} prevHash
 */
function computeHash(payload, prevHash) {
  const hashInput = stableStringify({ ...payload, prevHash });
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * WHY: Defensive runtime checks expose malformed write attempts early.
 * @param {string} id
 * @param {string} action
 * @param {'allowed'|'blocked'|'executed'} status
 * @param {string} reason
 */
function assertReceiptInput(id, action, status, reason) {
  if (!id || typeof id !== 'string') throw new Error('id must be a non-empty string');
  if (!action || typeof action !== 'string') throw new Error('action must be a non-empty string');
  if (!['allowed', 'blocked', 'executed'].includes(status)) throw new Error('status is invalid');
  if (!reason || typeof reason !== 'string') throw new Error('reason must be a non-empty string');
}

/**
 * WHY: Stateless builder keeps function pure and easy to reason about in isolation.
 * @param {string} prevHash
 * @param {string} id
 * @param {string} action
 * @param {'allowed'|'blocked'|'executed'} status
 * @param {string} reason
 * @returns {ReceiptRecord}
 */
export function createReceipt(prevHash, id, action, status, reason) {
  assertReceiptInput(id, action, status, reason);

  const ts = new Date().toISOString();
  const payload = { id, ts, action, status, reason };
  const hash = computeHash(payload, prevHash);

  return { id, ts, action, status, reason, prevHash, hash };
}

/**
 * WHY: Verification function provides testable integrity checks for debugging and audit.
 * @param {ReceiptRecord[]} receipts
 * @returns {{ok: boolean, firstBrokenIndex: number}}
 */
export function verifyChain(receipts) {
  if (!Array.isArray(receipts)) throw new Error('receipts must be an array');
  if (receipts.length === 0) return { ok: true, firstBrokenIndex: -1 };

  // WHY: 显式校验首条收据的 prevHash 必须为 GENESIS，确保链起点正确
  if (receipts[0].prevHash !== 'GENESIS') {
    return { ok: false, firstBrokenIndex: 0 };
  }

  for (let i = 0; i < receipts.length; i += 1) {
    const current = receipts[i];
    const expectedPrev = i === 0 ? 'GENESIS' : receipts[i - 1].hash;
    const recalculatedHash = computeHash(
      { id: current.id, ts: current.ts, action: current.action, status: current.status, reason: current.reason },
      expectedPrev
    );
    if (current.prevHash !== expectedPrev || current.hash !== recalculatedHash) {
      return { ok: false, firstBrokenIndex: i };
    }
  }

  return { ok: true, firstBrokenIndex: -1 };
}

/**
 * WHY: v1 链上锚定使用收据链的末条 hash 作为根，先确保链完整性再输出 root。
 * @param {ReceiptRecord[]} receipts
 * @returns {string}
 */
export function computeReceiptRoot(receipts) {
  if (!Array.isArray(receipts)) throw new Error('receipts must be an array');
  if (receipts.length === 0) return 'GENESIS';

  const chainCheck = verifyChain(receipts);
  if (!chainCheck.ok) {
    throw new Error(`invalid receipt chain at index ${chainCheck.firstBrokenIndex}`);
  }
  return receipts[receipts.length - 1].hash;
}

/*
[For Future AI]
1. Key assumptions made:
   - Receipt hash includes id, ts, action, status, reason, and prevHash.
   - First record always uses prevHash = "GENESIS" and verifyChain enforces this.
   - stableStringify recursively sorts nested objects for deterministic hashing.
   - Status must be one of: 'allowed', 'blocked', 'executed'.
2. Potential edge cases to watch:
   - Clock skew if receipts are generated across distributed nodes.
   - Backfilling historical receipts may require deterministic timestamps.
   - stableStringify does not handle circular references or special types (Date, Map, Set).
3. Dependencies on other modules:
   - Called by orchestrator after guardrail decision/execution.
   - Verification result should feed reputation-scoring logic.
*/
