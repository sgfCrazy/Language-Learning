## Context

review-system 已归档。当前练习页采用"连词成句"交互，遇到句法/词汇疑问只能退出查词典，打断心流。
本 change 在练习页内嵌 AI 问答助手：提问自动附带当前句子的英文/中文/词块上下文，
调用外部 LLM（OpenAI 兼容协议，默认智谱 GLM），返回解答；并做配额控制（每日 2 次免费，
超出消耗金币，钻石暂以金币体系记账）与隐私/安全过滤。

## Goals / Non-Goals

**Goals:**
- 练习页内 AI 助手：提问自动带当前句子上下文（AI-001）。
- 每日 2 次免费提问，超出扣钻石（本期以金币记账，AI-002），按自然日重置。
- 仅传输当前句子与问题，不泄露用户隐私字段（AI-003）；返回内容做基础安全过滤。
- Web 与小程序接口、配额规则一致（AI-004）。

**Non-Goals:**
- 不做对话式多轮记忆（单轮问答）。
- 不做 AI 出题/改题（归 course-editor）。
- 不做独立"钻石"账本（本期以金币体系代管，see D4）。

## Decisions

### D1: LLM 通过 OpenAI 兼容协议接入
用 env 配置 `LLM_PROVIDER` / `LLM_BASE_URL` / `LLM_API_KEY`（.env 已有占位）。
默认 `glm`（智谱 GLM-4-Flash 兼容 chat/completions）。抽象 `AiLlmClient` 接口，
`OpenAiLlmClient` 实现；测试用 fake 覆盖，不触网。无 API_KEY 时走 fallback（返回重试文案）。

### D2: 配额用 AiAskLog 表 + 自然日聚合
新增 `AiAskLog` 表（userId、question、context、answer、mode: free/billed）、
`createdAt`。免费额度 = 当日 mode=free 的条数 < 2。不需要单独每日重置表，
直接按日期聚合，天然跨端共享（AI-004）。

### D3: 超出额度扣金币（钻石以金币记账）
免费 2 次后，每次提问扣 `COINS_PER_AI_ASK = 50` 金币。余额不足 → 403 拒绝并提示充值。
`GamificationService` 加 `spendCoins`（负向 CoinTransaction，做余额校验）。

### D4: 隐私与安全过滤（拼在 shared 纯函数）
打包上下文 `buildAiPrompt(sentence, question) → {prompt, hasPii}`：
- 仅打包 sentence.text / sentence.translation / sentence.tokens / question。
- 用正则检测 PII（邮箱、手机号、URL、长数字串）→ 有则拒绝。
- 返回内容长度/敏感词基础过滤（`filterAiAnswer`），过长截断。

### D5: 接口与 DTO 放 shared
`AiAskDto`（question + context）、`AiQuotaDto`（freeUsed/freeLimit/balance）、
`AiAskResultDto`（answer、quota）。Web / 小程序共用，保证 AI-004 一致。

## Risks / Trade-offs

- [LLM 成本/审计] → AiAskLog 记录每次提问的 question/context/answer，供审计与成本核算。
- [作弊刷接口] → 免费次数按自然日限频；消耗走 CoinTransaction 原子记账。
- [无 API_KEY 时功能不可用] → fallback 文案，前端提示"AI 服务未配置"。

## Migration Plan

- Prisma 加 `AiAskLog` 表，`prisma migrate dev`。
- 新增 CoinTransaction.source 取值 `ai_billed`（复用现有表，无需迁移）。