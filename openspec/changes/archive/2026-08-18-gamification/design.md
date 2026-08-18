## Context

bootstrap-mvp-foundation 已归档，练习引擎 + 进度追踪已落地。现在在练习结算之上叠加游戏化层：
连击、SSS 评级、金币、每日任务、排行榜。`packages/shared/scoring.ts` 已有 `rateByScoreRate` 纯函数，
练习页已有连击的雏形（音效/震动）。本期把这些正式化并补齐后端持久化与排行榜。

## Goals / Non-Goals

**Goals:**
- 连击在练习过程中实时计算并展示，结算时持久化峰值。
- SSS 评级在结算页展示（已有纯函数，接前端 UI）。
- 金币账本：完成练习/任务发放金币，可查明细。
- 每日任务：3 种任务（练习 N 题、连续答对 M 次、学习 T 分钟），每日刷新。
- 排行榜：积分榜（周/月/总），用 Prisma 聚合（dev 无 Redis 用 SQL，部署时迁 Redis zset）。

**Non-Goals:**
- 不做 PK 对战积分（pk-battles change）。
- 不做金币消费/兑换（后续 change）。
- 不做连击动画的复杂特效（仅简单数字 + 音效）。

## Decisions

### D1: 连击计算在前端，峰值上报后端
连击是练习过程中的实时状态，纯前端计算（每答对 +1，答错归零）。结算时把 `maxCombo` 上报到后端，
写入 `PracticeRecord` 或独立的 `SessionSummary`。本期扩展 `PracticeSubmitDto` 加 `maxCombo` 字段。

### D2: 金币用独立账本表
`CoinTransaction` 表记录每笔金币变动（source: practice/task/daily_bonus, amount, balanceAfter）。
完成练习时按公式发放（base + comboBonus + ratingBonus）。

### D3: 每日任务用 `DailyTask` 表
每日生成 3 个任务（按模板），用户完成后标记。任务类型枚举：`practice_count`、`combo_streak`、`study_duration`。
进度从当日的 `PracticeRecord` 聚合计算，不需额外写进度。

### D4: 排行榜用 SQL 聚合（dev），Redis zset（prod）
dev 无 Redis，用 Prisma `groupBy` + `aggregate` 实现周/月/总积分榜。积分 = 当期所有 `CoinTransaction.amount` 之和。
部署有 Redis 后替换为 `ZINCRBY` / `ZREVRANGE`。

### D5: practice-engine spec delta 已定义 PE-005 MODIFIED
结算时输出连击峰值与评级指标。本期在 `PracticeSubmitDto` 加 `maxCombo` 与 `scoreRate`，
后端存入 `PracticeRecord`（加两列），结算时返回评级。

## Risks / Trade-offs

- [SQL 排行榜在大数据量下慢] → dev 期可接受；prod 迁 Redis。加索引。
- [金币发放并发竞态] → 用事务 + 乐观锁（version 字段）或 `UPDATE ... SET balance = balance + N`。

## Migration Plan

- Prisma 加表 + 加列，`prisma migrate dev`。
- 无数据迁移（新字段对旧记录为 null，查询时 coalesce 0）。
