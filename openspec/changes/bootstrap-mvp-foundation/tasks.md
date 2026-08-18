## 1. Monorepo 与工程基础设施

- [x] 1.1 初始化 pnpm workspaces（`pnpm-workspace.yaml`、根 `package.json`、`.npmrc`、`tsconfig.base.json`、ESLint+Prettier 配置） — shared — 验收：`pnpm install` 成功，`pnpm lint` 通过空仓
- [x] 1.2 添加 `packages/shared`（类型/枚举/DTO 导出，含 `PracticeMode`、`Rating`、`AuthClient` 枚举与各 capability 的 DTO） — shared — 验收：`pnpm -F @app/shared build` 产物可被 server/web 引用
- [x] 1.3 添加 `packages/shared/platform` 适配层接口定义（`playSound`、`record`、`vibrate`、`storage`、`request`、`getWxLoginCode`） — shared — 验收：接口编译通过，Web 与 Taro 各提供桩实现
- [x] 1.4 添加 `apps/server` NestJS 骨架（NestJS + Prisma + config 模块 + 全局异常过滤器 + `/api/v1` 前缀 + 统一错误体） — server — 验收：`pnpm -F @app/server dev` 启动，`GET /api/v1/health` 返回 200
- [x] 1.5 添加 `apps/web-taro` Taro 4 工程（React + TS + Tailwind + Zustand + TanStack Query + 平台适配注入） — web/miniapp — 验收：`pnpm -F @app/web-taro dev:h5` 与 `dev:weapp` 均能启动
- [x] 1.6 配置 Vitest（shared/web）与 Jest+supertest（server）入口与示例用例 — shared/server/web — 验收：`pnpm test` 全绿

## 2. 数据模型与 Prisma（server）

- [ ] 2.1 编写 `schema.prisma`：`User`、`UserAuth`（微信/邮箱）、`CoursePack`、`Course`、`Sentence`、`Token`、`UserCoursePack`、`CourseProgress`、`PracticeRecord`、`RefreshToken` — server — 验收：`prisma migrate dev` 生成迁移，模型覆盖 4 个 capability 所需字段
- [ ] 2.2 生成 Prisma 类型并导出到 `packages/shared`（`@app/shared/prisma`）供前端复用 — shared/server — 验收：前端可 import 类型且无循环依赖
- [ ] 2.3 种子数据脚本（2 个课程包 × 各 2 课程 × 各 8 句，含拆解词块） — server — 验收：`pnpm seed` 后商城列表非空

## 3. 用户认证（user-auth）

- [ ] 3.1 `AuthModule`：微信小程序登录端点 `POST /api/v1/auth/wx/miniapp`（code → jscode2session → upsert user → 签 JWT） — server — 验收：supertest 用 mock 微信响应登录成功返回 token
- [ ] 3.2 微信 Web 扫码登录：`POST /api/v1/auth/wx/qrcode` 生成 ticket、`GET /api/v1/auth/wx/poll?ticket=` 轮询、OAuth 回调 `GET /api/v1/auth/wx/callback` — server — 验收：mock 微信回调后轮询返回 token
- [ ] 3.3 邮箱注册/登录端点（bcrypt + 统一错误） — server — 验收：错误用例返回"邮箱或密码错误"，不泄露具体项
- [ ] 3.4 JWT 策略 + Refresh 端点 + 登出吊销（Redis） — server — 验收：过期 access + 有效 refresh 换新；登出后 refresh 失效
- [ ] 3.5 平台适配层实现：小程序 `getWxLoginCode`、Web 扫码二维码渲染与轮询 — web/miniapp — 验收：两端能各走通对应登录流程并拿到 JWT
- [ ] 3.6 前端登录页与 auth store（Zustand 持久化 token、自动刷新拦截器） — web/miniapp — 验收：登录后刷新页面仍保持会话

## 4. 课程目录（course-catalog）

- [ ] 4.1 `CourseCatalogModule`：商城列表（筛选/搜索/分页）、详情、加入学习、获取练习数据（句子懒加载） — server — 验收：supertest 覆盖筛选/搜索/加入/懒加载
- [ ] 4.2 `UserCourseModule`：进度读写（课程位置/模式/句子序号），完成课程标记 — server — 验收：跨请求读写进度一致，完成课程后整体进度更新
- [ ] 4.3 前端商城列表页（筛选/搜索/分页） — web/miniapp — 验收：列表渲染正确，筛选/搜索生效
- [ ] 4.4 前端课程包详情页（课程列表 + 进度 + 加入/继续入口） — web/miniapp — 验收：未加入/已加入两态展示正确
- [ ] 4.5 前端课程学习容器（加载句子、维护当前位置、模式切换骨架） — web/miniapp — 验收：切换到未实现模式给出提示且进度不丢

## 5. 练习引擎（practice-engine）

- [ ] 5.1 拆句工具：将英文句子拆成词块（含标点独立、保留正确顺序） — shared — 验收：单元测试覆盖普通句/标点/缩写
- [ ] 5.2 连词成句拼接组件（累加式片段展示、当前步骤高亮） — web/miniapp — 验收：逐步渲染与 spec PE-002 示例一致
- [ ] 5.3 输入与判定：Web 键入 + 小程序点选两条交互路径，统一判定逻辑 — web/miniapp — 验收：对错判定两端一致，错误即时标红并计数
- [ ] 5.4 中译英模式完整流程（中文展示、拼接、跳过标记未掌握） — web/miniapp — 验收：完成/跳过两路径都写入对应状态
- [ ] 5.5 按句评分实现（正确率/用时/尝试次数） — shared — 验收：单元测试覆盖零错误快速、多次错误两档评分
- [ ] 5.6 平台适配层接入：答对/答错音效与震动经适配层调用 — web/miniapp — 验收：业务代码无 `Taro.*`/`Audio` 直调

## 6. 进度追踪（progress-tracking）

- [ ] 6.1 `ProgressModule`：写入练习记录端点（含离线补传去重） — server — 验收：重复上报相同 `(userId,sentenceId,clientTimestamp)` 不产生重复记录
- [ ] 6.2 热力图、成长曲线、连续打卡、课程详情聚合查询端点 — server — 验收：supertest 验证聚合数值与连续打卡断日归零
- [ ] 6.3 前端离线缓存与补传（适配层 storage + 恢复后批量上报） — web/miniapp — 验收：断网完成练习后联网补传成功
- [ ] 6.4 前端成长页（热力图 + 成长曲线 + 课程详情） — web/miniapp — 验收：数据与接口一致，跨端切换后从服务端刷新

## 7. 联调与验收

- [ ] 7.1 端到端用例脚本（Playwright Web：登录→加入→练完一课→成长页有数据） — web — 验收：`pnpm e2e` 绿
- [ ] 7.2 小程序端手工验收清单（开发者工具跑通同一闭环） — miniapp — 验收：清单逐项通过
- [ ] 7.3 `openspec validate bootstrap-mvp-foundation --strict` 通过，归档前自检 — shared — 验收：校验无错误
