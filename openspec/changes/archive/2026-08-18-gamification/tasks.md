## 1. 数据模型扩展

- [x] 1.1 Prisma schema 加 `CoinTransaction`、`DailyTask` 表；`PracticeRecord` 加 `maxCombo`、`scoreRate` 列 — server — 验收：migrate + generate 成功
- [x] 1.2 shared DTO 扩展：`PracticeSubmitDto` 加 `maxCombo`/`scoreRate`；新增 `CoinTransactionDto`/`DailyTaskDto`/`LeaderboardEntryDto` — shared — 验收：typecheck + build 通过

## 2. 后端 GamificationModule

- [x] 2.1 `GamificationService`：练习结算时发放金币（base + comboBonus + ratingBonus），写 `CoinTransaction` — server — 验收：supertest 验证金币发放
- [x] 2.2 每日任务：`DailyTaskService` 生成当日 3 任务、查询完成状态（从 PracticeRecord 聚合） — server — 验收：supertest 验证任务列表 + 完成判定
- [x] 2.3 排行榜：`LeaderboardService` 积分榜（周/月/总），SQL 聚合 CoinTransaction — server — 验收：supertest 验证返回排序
- [x] 2.4 `GamificationController`：`GET /gamification/coins`、`GET /gamification/daily-tasks`、`GET /gamification/leaderboard` — server — 验收：supertest 覆盖三个端点
- [x] 2.5 修改 `ProgressController.submit`：结算时调用 GamificationService 发金币 + 存 maxCombo/scoreRate — server — 验收：supertest 验证结算返回金币与评级

## 3. 前端游戏化

- [x] 3.1 练习页连击实时计算 + 展示（combo 计数器 + Perfect/Great 文字 + 音效） — web/miniapp — 验收：答对累加、答错归零、音效经适配层
- [x] 3.2 练习结算反馈：完成一句后显示评级（C-SSS）与得分 — web/miniapp — 验收：结算页展示评级
- [x] 3.3 任务中心页：展示每日任务列表与完成状态 — web/miniapp — 验收：页面渲染任务列表
- [x] 3.4 排行榜页：展示积分榜（周/月/总切换） — web/miniapp — 验收：页面渲染排行榜

## 4. 测试与归档

- [x] 4.1 `openspec validate gamification --strict` 通过 — shared — 验收：校验无错误
- [x] 4.2 全仓 typecheck + test 全绿 — shared — 验收：无错误
