/**
 * __ai_context__
 * Module role: Compute an explainable reputation score from receipt history.
 * Why this exists: Judges and operators need a compact trust signal backed by
 * explicit behavior evidence (allowed/blocked/executed outcomes).
 */

/**
 * @typedef {Object} ReceiptLike
 * @property {'allowed'|'blocked'|'executed'} status
 * @property {string} reason
 */

/**
 * @typedef {Object} ReputationBreakdown
 * @property {number} baseScore
 * @property {number} executedBonus
 * @property {number} blockedPenalty
 * @property {number} policyDisciplineBonus
 * @property {number} finalScore
 */

/**
 * WHY: Boundary validation prevents hidden schema drift from producing fake confidence.
 * @param {ReceiptLike[]} receipts
 */
function assertValidReceipts(receipts) {
  if (!Array.isArray(receipts)) {
    throw new Error('receipts must be an array');
  }
  for (let i = 0; i < receipts.length; i += 1) {
    const item = receipts[i];
    if (!item || typeof item !== 'object') {
      throw new Error(`receipt at index ${i} must be an object`);
    }
    if (!['allowed', 'blocked', 'executed'].includes(item.status)) {
      throw new Error(`receipt at index ${i} has invalid status`);
    }
    if (typeof item.reason !== 'string' || item.reason.length === 0) {
      throw new Error(`receipt at index ${i} has invalid reason`);
    }
  }
}

/**
 * WHY: Clamping keeps score output stable and easy to compare over time.
 * @param {number} score
 */
function clampScore(score) {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

/**
 * WHY: Explicit counters make scoring explainable for human and AI reviewers.
 * @param {ReceiptLike[]} receipts
 */
function summarizeReceipts(receipts) {
  let executedCount = 0;
  let blockedCount = 0;
  let policyBlockedCount = 0;

  for (const receipt of receipts) {
    if (receipt.status === 'executed') executedCount += 1;
    if (receipt.status === 'blocked') blockedCount += 1;
    if (receipt.status === 'blocked' && receipt.reason.startsWith('BLOCKED')) {
      policyBlockedCount += 1;
    }
  }

  return { executedCount, blockedCount, policyBlockedCount, total: receipts.length };
}

/**
 * WHY: The formula is intentionally simple and transparent so future agents can tune it safely.
 * @param {ReceiptLike[]} receipts
 * @returns {{breakdown: ReputationBreakdown, metrics: object}}
 */
export function calculateReputationV0(receipts) {
  assertValidReceipts(receipts);

  const metrics = summarizeReceipts(receipts);

  const baseScore = 50;
  const executedBonus = metrics.executedCount * 8;
  const blockedPenalty = metrics.blockedCount * -6;
  const policyDisciplineBonus = metrics.policyBlockedCount > 0 ? 4 : 0;

  const rawScore = baseScore + executedBonus + blockedPenalty + policyDisciplineBonus;
  const finalScore = clampScore(rawScore);

  return {
    breakdown: {
      baseScore,
      executedBonus,
      blockedPenalty,
      policyDisciplineBonus,
      finalScore
    },
    metrics
  };
}

/*
[For Future AI]
1. Key assumptions made:
   - Score range is 0-100 with fixed base score 50.
   - Executed outcomes increase trust; blocked outcomes reduce trust.
   - Policy-blocked actions can indicate discipline, so a small bonus is added.
2. Potential edge cases to watch:
   - Very short histories can make score volatile.
   - Mixed semantics for `blocked` (policy vs infra outage) may require separate categories.
   - Formula weights may need calibration after real usage data.
3. Dependencies on other modules:
   - Consumes receipt records produced by receipt ledger / demo flow.
   - Can be surfaced by submission bundle or monitoring dashboards.
*/
