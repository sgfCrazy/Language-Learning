## Why

练习闭环跑通后，需要游戏化机制让学习"上瘾"：连击带来即时爽感、SSS 评级驱动重复刷课、金币与每日任务形成长期留存、排行榜引入社交竞争。这是句乐部区别于普通背单词工具的核心体验。

## What Changes

- 连击系统：连续答对累加连击数，触发 Perfect/Great 反馈；连击越高分数加成越高（20 连击翻倍）；断答重置。
- SSS 评级：练习结束按得分率给出 C→B→A→S→SS→SSS 评级（SSS 需 ≥95% 得分率）。
- 金币与每日任务：完成练习/任务发放金币；每日任务列表与完成状态。
- 排行榜：学习时长榜、积分榜、周/月/总榜。
- 跨端一致：评级与连击判定逻辑在 `packages/shared`，前端展示与音效经适配层。

## Non-goals

- 不做 PK 实时对战（归 `pk-battles`）。
- 不做学习小组/社区动态（后续 change）。
- 不做会员/付费兑换金币（后续 change）。

## Capabilities

### New Capabilities

- `gamification`: 连击、SSS 评级、金币、每日任务、排行榜

### Modified Capabilities

- `practice-engine`: 练习结束需输出评级与连击结果（仅行为接口，不改判定本质）

## Impact

- 后端新增 `GamificationModule`（连击/评级计算、金币账本、任务、排行榜聚合）。
- `packages/shared` 新增评级与连击计算纯函数。
- 前端练习结算页、任务中心、排行榜页；连击动画与音效走适配层。
- 依赖 Redis（排行榜 zset、连击防刷）。
