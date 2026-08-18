## 1. 复习算法纯函数

^- [x] 1.1 `packages/shared` 加 `review.ts`：SM-2 变体调度函数（updateReviewState）+ 单测 — shared — 验收：单元测试覆盖答对/答错/掌握判定

## 2. 后端 ReviewModule

^- [x] 2.1 `ReviewService`：生词本 CRUD（标记/移除/列表/移入掌握） — server — 验收：supertest 覆盖增删查
^- [x] 2.2 每日复习推荐：从 PracticeRecord 找答错的句子 + UserVocab 到期项 — server — 验收：supertest 验证返回到期项
^- [x] 2.3 答题时更新复习调度：ProgressController 结算后调用 ReviewService 更新 UserVocab/句子复习状态 — server — 验收：supertest 验证答对延长间隔
^- [x] 2.4 `ReviewController`：`GET /review/today`、`GET /review/vocab`、`POST /review/vocab`、`DELETE /review/vocab/:id`、`POST /review/vocab/:id/master` — server — 验收：supertest 覆盖端点

## 3. 前端复习

^- [x] 3.1 练习页加"标记生词"按钮，调用后端添加生词 — web/miniapp — 验收：点击后生词本出现该词
^- [x] 3.2 复习本页：展示当日到期项，点击进入练习 — web/miniapp — 验收：页面渲染到期列表
^- [x] 3.3 生词本页：展示/移除/移入掌握 — web/miniapp — 验收：页面渲染生词列表与操作

## 4. 测试与归档

^- [x] 4.1 `openspec validate review-system --strict` 通过 — shared — 验收：校验无错误
^- [x] 4.2 全仓 typecheck + test 全绿 — shared — 验收：无错误
