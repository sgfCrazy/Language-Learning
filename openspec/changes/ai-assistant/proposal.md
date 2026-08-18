## Why

练习中遇到语法/用法疑问时，切出去查词典会打断心流。学习页内嵌 AI 助手能自动理解当前句子上下文，即时解答，降低学习摩擦。

## What Changes

- 学习页右下角 AI 助手入口，自动附带当前练习句子上下文。
- 用户提问，调用外部 LLM（OpenAI/智谱 GLM），返回解答。
- 每日 2 次免费提问，超出消耗钻石（与金币体系衔接）。
- 上下文安全：不泄露用户隐私字段，仅传句子与问题。

## Non-goals

- 不做对话式多轮记忆（本期单轮即可）。
- 不做 AI 出题/改题（归 `course-editor`）。

## Capabilities

### New Capabilities

- `ai-assistant`: 学习页内嵌 AI 问答（上下文感知、配额控制）

### Modified Capabilities

（无，仅消费现有练习上下文，不改练习引擎行为）

## Impact

- 后端新增 `AiAssistantModule`（LLM 适配、配额、上下文拼装、内容安全过滤）。
- `packages/shared` 新增提问/响应 DTO 与配额枚举。
- 前端助手浮窗组件；配额 UI。
- 外部依赖：LLM API key 与计费。
