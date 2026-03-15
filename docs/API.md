# API Reference / API 参考文档

> **Version / 版本**: v0.1 | **Modules / 模块**: `apps/agent-core` + `packages/receipt-sdk`

---

## Spending Guardrails / 消费护栏

**Module Path / 模块路径**: `apps/agent-core/src/guardrails.js`

### `evaluateSpendRequest(policy, request) → GuardDecision`

Evaluate whether a spend request complies with human-defined policy.

评估一笔消费请求是否符合人类设定的策略。

**Parameters / 参数**:

| Param / 参数 | Type / 类型 | Description / 说明 |
|------|------|------|
| `policy` | `SpendPolicy` | Human-defined spending policy / 人类设定的消费策略 |
| `request` | `SpendRequest` | Agent-initiated spend request / Agent 发起的消费请求 |

**SpendPolicy Structure / SpendPolicy 结构**:

```javascript
/** @typedef {Object} SpendPolicy
 *  @property {number}   perTxLimitUsd       - Per-tx limit (USD) / 单笔交易上限
 *  @property {string[]} recipientAllowlist  - Approved recipients / 被批准的收件人列表
 */
```

**SpendRequest Structure / SpendRequest 结构**:

```javascript
/** @typedef {Object} SpendRequest
 *  @property {string} requestId  - Unique request ID (for receipt tracing) / 唯一请求 ID
 *  @property {number} amountUsd  - Requested amount (USD) / 请求金额
 *  @property {string} recipient  - Recipient identifier / 收件人标识
 */
```

**Returns / 返回值**: `GuardDecision`

```javascript
/** @typedef {Object} GuardDecision
 *  @property {boolean} allowed
 *  @property {'ALLOWED'|'BLOCKED_LIMIT'|'BLOCKED_RECIPIENT'|'BLOCKED_MULTIPLE'} reason
 *  @property {string[]} violations
 */
```

**Usage Example / 使用示例**:

```javascript
import { evaluateSpendRequest } from './guardrails.js';

const policy = {
  perTxLimitUsd: 100,
  recipientAllowlist: ['wallet:ops', 'service:compute']
};

const request = {
  requestId: 'req-001',
  amountUsd: 75,
  recipient: 'wallet:ops'
};

const decision = evaluateSpendRequest(policy, request);
// → { allowed: true, reason: 'ALLOWED', violations: [] }
```

**Error Behavior / 异常行为**:
- `policy` is `null` or missing required fields → throws `Error` / 抛出异常
- `request` is `null` or has wrong field types → throws `Error` / 抛出异常
- Amount exactly equals limit → **allowed** (uses `>` not `>=`) / 金额恰好等于限额会被允许

---

## Receipt Ledger / 收据账本

**Module Path / 模块路径**: `packages/receipt-sdk/src/receiptLedger.js`
**Package Name / 包名**: `receipt-sdk`

### `createReceipt(prevHash, id, action, status, reason) → ReceiptRecord`

Create a new hash-linked receipt.

创建一条新的哈希链式收据。

**Parameters / 参数**:

| Param / 参数 | Type / 类型 | Description / 说明 |
|------|------|------|
| `prevHash` | `string` | Previous receipt's hash; `'GENESIS'` for first / 前一条收据的 hash，首条使用 `'GENESIS'` |
| `id` | `string` | Action/request unique ID / 操作/请求的唯一 ID |
| `action` | `string` | Action type (e.g. `'spend'`) / 操作类型 |
| `status` | `'allowed' \| 'blocked' \| 'executed'` | Execution status / 执行状态 |
| `reason` | `string` | Decision reason (e.g. `'ALLOWED'`) / 决策原因 |

**Returns / 返回值**: `ReceiptRecord`

```javascript
/** @typedef {Object} ReceiptRecord
 *  @property {string} id       - Action ID / 操作 ID
 *  @property {string} ts       - ISO 8601 timestamp (auto-generated) / 时间戳 (自动生成)
 *  @property {string} action   - Action type / 操作类型
 *  @property {'allowed'|'blocked'|'executed'} status
 *  @property {string} reason   - Decision reason / 决策原因
 *  @property {string} prevHash - Previous receipt's hash / 前一条收据的哈希
 *  @property {string} hash     - Current receipt's SHA-256 hash / 当前收据的哈希
 */
```

**Usage Example / 使用示例**:

```javascript
import { createReceipt, verifyChain } from 'receipt-sdk';

// Create first receipt (chain starts from GENESIS)
// 创建第一条收据 (从 GENESIS 开始)
const receipt1 = createReceipt('GENESIS', 'req-001', 'spend', 'executed', 'ALLOWED');

// Create second receipt (linked to first)
// 创建第二条收据 (链到第一条)
const receipt2 = createReceipt(receipt1.hash, 'req-002', 'spend', 'blocked', 'BLOCKED_LIMIT');
```

**Error Behavior / 异常行为**:
- Empty `id` → throws `Error('id must be a non-empty string')` / 抛出异常
- Invalid `status` → throws `Error('status is invalid')` / 抛出异常

---

### `verifyChain(receipts) → { ok: boolean, firstBrokenIndex: number }`

Verify the integrity of a receipt chain.

验证收据链的完整性。

**Parameters / 参数**:

| Param / 参数 | Type / 类型 | Description / 说明 |
|------|------|------|
| `receipts` | `ReceiptRecord[]` | Receipts in chronological order / 按时间顺序排列的收据数组 |

**Returns / 返回值**:

| Field / 字段 | Description / 说明 |
|------|------|
| `ok` | `true` = chain intact, `false` = tampering detected / 链完整 / 检测到篡改 |
| `firstBrokenIndex` | Index of first anomalous receipt; `-1` if intact / 第一个异常收据的索引 |

**Usage Example / 使用示例**:

```javascript
const chain = [receipt1, receipt2];
const result = verifyChain(chain);

if (result.ok) {
  console.log('Chain intact, all receipts verified');
  console.log('链完整，所有收据未被篡改');
} else {
  console.log(`Anomaly detected at index ${result.firstBrokenIndex}`);
  console.log(`在索引 ${result.firstBrokenIndex} 处检测到异常`);
}
```

**Verification Rules / 验证规则**:
1. Empty array → `{ ok: true, firstBrokenIndex: -1 }` / 空数组视为完整
2. First receipt's `prevHash` must be `'GENESIS'` / 首条的 `prevHash` 必须为 `'GENESIS'`
3. Each receipt's `prevHash` must equal previous receipt's `hash` / 每条的 `prevHash` 须等于前一条的 `hash`
4. Each receipt's `hash` must match recomputed value / 每条的 `hash` 须与重新计算值一致

**Error Behavior / 异常行为**:
- Non-array input → throws `Error('receipts must be an array')` / 非数组输入抛出异常

---

## Demo CLI / 演示 CLI

**Module Path / 模块路径**: `apps/agent-core/src/demoCli.js`

### `runDemoScenarios() → DemoReport`

Run two preset scenarios and generate a demo report.

运行两个预设场景并生成演示报告。

**Scenarios / 场景**:
1. **Allowed / 允许**: $75 → wallet:ops (within limit + allowlisted / 在限额内 + 白名单中)
2. **Blocked / 拒绝**: $180 → wallet:ops (exceeds $100 limit / 超过 $100 限额)

**Returns / 返回值**:

```javascript
{
  scenario1: {
    request: SpendRequest,      // Scenario 1 request / 场景 1 的请求
    decision: GuardDecision,    // Guardrail decision / 护栏决策
    execution: 'executed'       // Simulated result / 模拟执行结果
  },
  scenario2: {
    request: SpendRequest,
    decision: GuardDecision,
    execution: 'blocked'
  },
  chainCheck: {
    ok: true,                   // Chain integrity result / 链完整性检查结果
    firstBrokenIndex: -1
  },
  receipts: ReceiptRecord[]     // Generated receipt chain / 生成的收据链
}
```

---

## Submission Autopilot / 提交自动驾驶仪

**Module Path / 模块路径**: `apps/agent-core/src/submissionAutopilot.js`

### `generateSubmissionBundle(demoReportPath?, bundleDir?) → BundleOutput`

Generate submission bundle from demo report.

从演示报告生成提交包。

**Parameters / 参数**:

| Param / 参数 | Type / 类型 | Default / 默认值 | Description / 说明 |
|------|------|--------|------|
| `demoReportPath` | `string` | `docs/demo/demo-report.json` | Demo report path / 演示报告路径 |
| `bundleDir` | `string` | `docs/submission-bundle/` | Output directory / 输出目录 |

**Generated Files / 生成的文件**:
- `README_SUBMISSION.md` — Submission summary / 提交摘要
- `DEMO_SCRIPT.md` — Demo script (2-3 min) / 演示脚本
- `CHANGELOG.md` — Change log / 变更日志

**Error Behavior / 异常行为**:
- Demo report not found → throws `Error('Demo report not found at: ...')` / 报告不存在则抛出异常
