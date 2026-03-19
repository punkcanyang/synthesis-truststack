# Synthesis TrustStack

> **AI Agent Trust Execution Stack** — Making every AI agent action verifiable, auditable, and trustworthy.
>
> **AI Agent 信任执行栈** — 让 AI 代理的每一次操作都可验证、可审计、可信赖。

TrustStack is a trust infrastructure built for AI Agent economic scenarios. The core problem it solves: **When AI agents execute actions on behalf of humans (spending money, calling services), how can we ensure operations stay within human-defined rules, and leave tamper-proof evidence for every action?**

TrustStack 是一个为 AI Agent 经济场景打造的信任基础设施。它解决的核心问题是：**当 AI 代理代表人类执行操作（如花钱、调用服务）时，如何确保操作在人类设定的规则内执行，并为每次操作留下不可篡改的证据链？**

---

## Core Concepts / 核心概念

### Why TrustStack? / 为什么需要 TrustStack？

In the AI Agent era, agents execute real-world actions on behalf of users — transfers, API calls, service purchases. This creates three fundamental trust challenges:

在 AI Agent 时代，代理会代表用户执行实际操作——转账、调用 API、购买服务。这带来三个根本性信任挑战：

| Challenge / 挑战 | TrustStack Solution / 解决方案 |
|---|---|
| **Agent may exceed authorization** / Agent 可能超越授权范围 | Spending Guardrails enforce policy pre-execution / 消费护栏在执行前强制检查策略 |
| **Action history may be tampered** / 操作历史可能被篡改 | Receipt Ledger guarantees immutability via hash chains / 收据账本用哈希链保证不可变性 |
| **Lack of verifiable audit trail** / 缺乏可供验证的审计痕迹 | Every decision and execution generates structured receipts / 每次决策和执行都生成结构化收据 |

### Three Core Modules / 三个核心模块

```
┌──────────────────────────────────────────────────────────┐
│                     TrustStack System                     │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │  Guardrails  │──▶│   Executor   │──▶│   Receipt    │  │
│  │  消费护栏     │   │   执行引擎    │   │   Ledger     │  │
│  │              │   │              │   │   收据账本    │  │
│  └──────────────┘   └──────────────┘   └──────────────┘  │
│    Policy Check       Simulated          SHA-256 Chain    │
│    策略检查            模拟执行            哈希链存证       │
│        ▼                  ▼                   ▼          │
│  ALLOWED / BLOCKED   executed / blocked   Hash-linked    │
└──────────────────────────────────────────────────────────┘
```

1. **Spending Guardrails / 消费护栏** — Validates requests against human-defined policies (per-tx limit + recipient allowlist) before any action executes / 在任何操作执行前，根据人类设定的策略（单笔限额 + 收件人白名单）进行合规检查
2. **Receipt Ledger / 收据账本** — Creates SHA-256 hash-linked receipts for every decision and execution; any tampering is detectable / 为每次决策和执行创建 SHA-256 哈希链式收据，任何篡改都可被检测
3. **Submission Autopilot / 提交自动驾驶仪** — Automatically packages demo evidence into structured submission artifacts / 将演示证据自动打包为结构化提交产物
4. **On-Chain Anchor / 链上锚定** — Anchors receipt root to EVM testnet tx payload and verifies anchored root against local report / 将收据根锚定到 EVM 测试网交易载荷，并对比本地报告完成验证

---

## Quick Start / 快速开始

### Prerequisites / 环境要求

- Node.js ≥ 18.x (requires ESM and `node:test` support / 需要支持 ESM 和 `node:test`)
- npm ≥ 9.x

### Installation / 安装

```bash
git clone <repo-url>
cd synthesis-truststack
npm install
```

### Verification / 验证

```bash
# Run all checks (syntax + tests + AI-First structure)
# 运行全部检查（语法检查 + 测试 + AI-First 结构检查）
npm run check
```

### Run Demo / 运行演示

```bash
# Execute end-to-end demo flow
# 执行端到端演示流程
npm run demo

# Output / 输出:
# === TrustStack Demo Result ===
# scenario1: executed (ALLOWED)
# scenario2: blocked (BLOCKED_LIMIT)
# chainCheck: ok=true, firstBrokenIndex=-1
# artifact: docs/demo/demo-report.json
```

### Generate Submission Bundle / 生成提交包

```bash
npm run bundle
```

### On-Chain Anchor (EVM) / 链上锚定（EVM）

```bash
# 1) Anchor root to chain (requires unlocked sender account on RPC node)
# 1) 将 root 写入链上（RPC 节点需支持已解锁账户）
TRUSTSTACK_RPC_URL=https://your-testnet-rpc \
TRUSTSTACK_ANCHOR_FROM=0xYourSenderAddress \
npm run anchor

# 2) Verify tx payload root against local demo report
# 2) 用本地 demo 报告校验链上交易载荷中的 root
TRUSTSTACK_RPC_URL=https://your-testnet-rpc \
TRUSTSTACK_ANCHOR_TX_HASH=0xYourTxHash \
npm run verify-anchor
```

---

## Project Structure / 项目结构

```
synthesis-truststack/
├── apps/
│   └── agent-core/                  # Core application layer / 核心应用层
│       ├── package.json             # Workspace package definition / workspace 包定义
│       └── src/
│           ├── guardrails.js        # Spending guardrails engine / 消费护栏引擎
│           ├── guardrails.test.js   # Guardrails tests (8 cases) / 护栏测试 (8 个用例)
│           ├── demoCli.js           # E2E demo CLI / 端到端演示 CLI
│           ├── demoCli.test.js      # Demo test (1 case) / 演示测试 (1 个用例)
│           ├── submissionAutopilot.js     # Submission bundle generator / 提交包生成器
│           ├── submissionAutopilot.test.js # Submission test (1 case) / 提交测试 (1 个用例)
│           ├── onchainAnchor.js     # EVM anchor + verify module / EVM 锚定与验证模块
│           └── onchainAnchor.test.js # On-chain anchor tests / 链上锚定测试
├── packages/
│   └── receipt-sdk/                 # Receipt SDK package / 收据 SDK 包
│       ├── package.json             # Workspace package definition / workspace 包定义
│       └── src/
│           ├── receiptLedger.js     # Hash-chain receipt engine / 哈希链收据引擎
│           └── receiptLedger.test.js # Receipt tests (8 cases) / 收据测试 (8 个用例)
├── scripts/
│   └── assert-ai-first-structure.mjs  # AI-First compliance checker / AI-First 规范自动检查
├── docs/
│   ├── ARCHITECTURE.md          # System architecture / 系统架构详解
│   ├── API.md                   # API reference / API 参考文档
│   ├── AI_FIRST_RULES.md        # AI-First coding rules / AI-First 编码规范
│   ├── ISSUES-MVP.md            # MVP issue board (archived) / MVP 问题看板 (存档)
│   ├── demo/
│   │   └── demo-report.json     # Demo output artifact / 演示产出物
│   └── submission-bundle/       # Submission output artifacts / 提交包产出物
├── package.json                 # Root workspace config / 根 workspace 配置
├── Makefile                     # Shortcut commands / 快捷命令
├── TODO.md                      # Task tracking / 任务追踪
├── WORKLOG.md                   # Work log / 工作日志
└── README.md                    # ← You are here / 你正在阅读的文件
```

---

## Available Commands / 可用命令

| Command / 命令 | Description / 说明 |
|------|------|
| `npm run check` | Run all checks (lint + test + typecheck) / 运行全部检查 |
| `npm run lint` | Syntax check (`node --check`) / 语法检查 |
| `npm run test` | Run all tests (Node.js test runner) / 运行所有测试 |
| `npm run typecheck` | AI-First structure compliance check / AI-First 结构合规检查 |
| `npm run demo` | Execute E2E demo flow / 执行端到端演示流程 |
| `npm run bundle` | Generate submission bundle / 生成提交包 |
| `npm run anchor` | Anchor receipt root to EVM tx payload / 将收据根写入 EVM 交易载荷 |
| `npm run verify-anchor` | Verify anchored root vs local report / 校验链上 root 与本地报告是否一致 |
| `make check` | Makefile shortcut / Makefile 快捷方式 |
| `make demo` | Makefile shortcut / Makefile 快捷方式 |

---

## Tech Stack / 技术栈

| Technology / 技术 | Usage / 用途 | Rationale / 选择理由 |
|------|------|----------|
| **Node.js ESM** | Runtime / 运行时 | Native ES module support, no build step / 原生 ES 模块支持，无需构建 |
| **node:test** | Testing / 测试 | Zero dependency, built into Node.js / 零依赖，内置于 Node.js |
| **node:crypto** | Hashing / 哈希运算 | Provides SHA-256, no third-party lib needed / 提供 SHA-256，无需第三方库 |
| **JSDoc** | Type annotations / 类型标注 | No TS compile step, IDE still provides type hints / 无编译步骤，IDE 仍可提供类型提示 |
| **npm workspaces** | Package management / 包管理 | Module isolation in monorepo / monorepo 下模块隔离 |

> **Design Philosophy / 设计哲学**: Zero third-party dependencies. All Node.js built-in modules. / 零第三方依赖，全部使用 Node.js 内置模块。

---

## AI-First Coding Rules / AI-First 编码规范

This project follows **AI-First Software Architecture** principles, ensuring future AI agents can safely understand and modify the code.

本项目遵循 **AI-First Software Architecture** 原则，确保未来的 AI 代理能安全地理解和修改代码。

See [`docs/AI_FIRST_RULES.md`](docs/AI_FIRST_RULES.md) for full details. Key points / 核心要点:

- Every core module has `__ai_context__` header describing role and purpose / 每个核心模块包含 `__ai_context__` 顶部注释
- Every core module has `[For Future AI]` footer with assumptions, edge cases, dependencies / 每个核心模块尾部有 `[For Future AI]` 区块
- Comments explain **WHY**, not WHAT / 函数注释解释"为什么"而非"做了什么"
- `npm run typecheck` enforces compliance automatically / 自动检查合规性

---

## Branching Strategy / 分支策略

| Branch / 分支 | Purpose / 用途 |
|------|------|
| `main` | Always demoable / 永远可演示 |
| `feat/*` | New feature development / 新功能开发 |
| `fix/*` | Bug fixes / 问题修复 |
| `docs/*` | Documentation updates / 文档更新 |

---

## Roadmap / 路线图

### ✅ Completed / 已完成
- P0: Spending Guardrails + Receipt Ledger + E2E Demo / 消费护栏 + 收据账本 + 端到端演示
- P1: Submission Autopilot + One-command Demo / 提交自动驾驶仪 + 一键演示
- P2: Reputation Passport — Compute explainable trust scores from receipt history / 声誉护照 — 从收据历史中计算可解释的信誉分数
- P3: On-Chain Anchoring (v1) — Anchor receipt root into EVM tx payload + verifier script / 链上锚定（v1）— 将收据根写入 EVM 交易载荷并提供验证脚本

---

## License

Private — Hackathon project for The Synthesis.
