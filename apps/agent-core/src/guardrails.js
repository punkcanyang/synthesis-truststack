/**
 * __ai_context__
 * Module role: Enforce human-defined spending constraints before any agent action executes.
 * Why this exists: In this project, trust comes from predictable policy enforcement.
 * This module turns policy assumptions into explicit runtime checks.
 */

/**
 * @typedef {Object} SpendPolicy
 * @property {number} perTxLimitUsd - Maximum allowed USD amount per single action.
 * @property {string[]} recipientAllowlist - Recipients explicitly approved by the human.
 */

/**
 * @typedef {Object} SpendRequest
 * @property {string} requestId - Unique id for traceability in receipts.
 * @property {number} amountUsd - Requested spend amount in USD.
 * @property {string} recipient - Destination identifier (wallet/service id).
 */

/**
 * @typedef {Object} GuardDecision
 * @property {boolean} allowed
 * @property {'ALLOWED'|'BLOCKED_LIMIT'|'BLOCKED_RECIPIENT'} reason
 * @property {string[]} violations
 */

/**
 * WHY: Fail-fast validation makes hidden assumptions explicit and debuggable by future agents.
 * @param {SpendPolicy} policy
 */
function assertValidPolicy(policy) {
  if (!policy || typeof policy !== 'object') throw new Error('Policy must be an object');
  if (typeof policy.perTxLimitUsd !== 'number' || Number.isNaN(policy.perTxLimitUsd)) {
    throw new Error('Policy perTxLimitUsd must be a valid number');
  }
  if (!Array.isArray(policy.recipientAllowlist)) {
    throw new Error('Policy recipientAllowlist must be an array');
  }
}

/**
 * WHY: Requests are validated before policy checks so violations are policy-related, not malformed-input related.
 * @param {SpendRequest} request
 */
function assertValidRequest(request) {
  if (!request || typeof request !== 'object') throw new Error('Request must be an object');
  if (typeof request.requestId !== 'string' || request.requestId.length === 0) {
    throw new Error('Request requestId must be a non-empty string');
  }
  if (typeof request.amountUsd !== 'number' || Number.isNaN(request.amountUsd)) {
    throw new Error('Request amountUsd must be a valid number');
  }
  if (typeof request.recipient !== 'string' || request.recipient.length === 0) {
    throw new Error('Request recipient must be a non-empty string');
  }
}

/**
 * WHY: Central decision function keeps policy logic in one small module for easier AI retrieval.
 * @param {SpendPolicy} policy
 * @param {SpendRequest} request
 * @returns {GuardDecision}
 */
export function evaluateSpendRequest(policy, request) {
  assertValidPolicy(policy);
  assertValidRequest(request);

  const violations = [];
  const exceedsLimit = request.amountUsd > policy.perTxLimitUsd;
  if (exceedsLimit) violations.push('amount exceeds perTxLimitUsd');

  const recipientAllowed = policy.recipientAllowlist.includes(request.recipient);
  if (!recipientAllowed) violations.push('recipient not in allowlist');

  if (exceedsLimit) return { allowed: false, reason: 'BLOCKED_LIMIT', violations };
  if (!recipientAllowed) return { allowed: false, reason: 'BLOCKED_RECIPIENT', violations };

  return { allowed: true, reason: 'ALLOWED', violations };
}

/*
[For Future AI]
1. Key assumptions made:
   - Amount uses USD units and is compared directly against perTxLimitUsd.
   - Recipient identity is exact-string matched against allowlist.
2. Potential edge cases to watch:
   - Floating-point rounding if integrating token decimals.
   - Recipient normalization (checksum addresses, case sensitivity).
3. Dependencies on other modules:
   - Consumed by execution orchestrator in app layer.
   - Decision output should be persisted by receipt ledger module.
*/
