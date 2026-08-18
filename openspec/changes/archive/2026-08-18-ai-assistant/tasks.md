## 1. 共享层纯函数

^- [x] 1.1 `packages/shared/src/ai.ts`：DTO（AiAskDto/AiQuotaDto/AiAskResultDto）+ `buildAiPrompt` + `filterAiAnswer` + 常量（FREE_DAILY_QUOTA=2, COINS_PER_AI_ASK=50） — shared — 验收：单测覆盖 PII 检测、长度截断、配额计算
^- [x] 1.2 shared 单测 `test/ai.test.ts` — shared — 验收：vitest 全过

## 2. 后端 AiAssistantModule

^- [x] 2.1 Prisma `AiAskLog` 表 + migrate — server — 验收：schema 生效
^- [x] 2.2 `AiLlmClient` 接口 + `OpenAiLlmClient` 实现 + 无 key fallback — server — 验收：fake key 不触网
^- [x] 2.3 `AiAssistantService`：buildAiPrompt → 配额检查（当日 free<2）→ 扣金币/billed → 调 LLM → 记 AiAskLog — server — 验收：supertest 覆盖免费/超额/不足拒答
^- [x] 2.4 `AiAssistantController`：`POST /ai/ask`、`GET /ai/quota` — server — 验收：supertest 覆盖端点
^- [x] 2.5 `GamificationService.spendCoins(userId, amount, source, refId)` — server — 验收：余额不足抛错、成功记负向流水
^- [x] 2.6 ai e2e `test/ai.e2e-spec.ts`（override llm client）— server — 验收：jest 全绿

## 3. 前端 AI 助手

^- [x] 3.1 api client 加 `askAi` / `getAiQuota` — web/miniapp — 验收：typecheck 通过
^- [x] 3.2 练习页 AI 助手浮窗组件（输入框、发送、展示回答与剩余额度、余额不足提示）— web/miniapp — 验收：页面渲染、typecheck 通过

## 4. 测试与归档

^- [x] 4.1 `openspec validate ai-assistant --strict` 通过 — shared — 验收：校验无错误
^- [x] 4.2 全仓 typecheck + test 全绿 — shared — 验收：无错误