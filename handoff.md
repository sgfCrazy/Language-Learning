# Handoff — 迭代交接文档

> 每次迭代结束在此追加一节。新接手的人先读这里，再读 README.md 和 `openspec/`。

---

## 项目关键说明（必读）

### 项目是什么
句乐部风格的英语学习平台：核心玩法「连词成句」（看中文/听音频，把英文句子一步步拼出来）。
游戏化（连击/SSS 评级/PK/排行榜）为核心体验。同时覆盖 **Web** 与 **微信小程序**，并支持音视频/音乐课程的跟读与跟拼。

### 技术栈
- **跨端前端**：Taro 4 (React 18 + TypeScript) → 一套代码编译 Web/H5 + 微信小程序
- **状态**：Zustand；请求：TanStack Query；测试：Vitest
- **后端**：NestJS + Prisma + SQLite(dev) / PostgreSQL(prod) + Redis(待接)
- **AI**：外部 LLM API（OpenAI / 智谱 GLM）
- **存储**：对象存储（OSS/COS）
- **认证**：微信登录为主，邮箱密码为辅，JWT（access + refresh）
- **工程**：pnpm workspaces monorepo，Conventional Commits

### 目录结构
```
apps/web-taro/      跨端应用（H5 + weapp）
  src/
    pages/          页面（index/login/catalog/course/practice/growth）
    platform/       平台适配层（adapter.web.ts / adapter.miniapp.ts，#ifdef 条件编译）
    api/client.ts   API 客户端 + 离线补传队列
    store/auth.ts   Zustand auth store
  e2e/              Playwright E2E
  config/           Taro 构建配置（必须叫 config/index.ts，Taro CLI 不认 taro.config.ts）
  MINIAPP_CHECKLIST.md  小程序端手工验收清单
apps/server/        NestJS 后端
  src/
    auth/           AuthModule + WxClient（可 mock）+ JwtStrategy
    courses/        CoursesModule（商城/详情/加入/懒加载/进度）
    progress/       ProgressModule（记录去重/热力图/成长曲线/连续打卡）
    health/         /api/v1/health
    prisma/         PrismaService（全局）
    common/         异常过滤器 + CurrentUser 装饰器
  prisma/
    schema.prisma   10 模型（dev=sqlite，prod 改 postgresql）
    seed.ts         灌种子数据
  test/             Jest + supertest e2e
packages/shared/    共享类型/枚举/DTO/platform 接口/tokenize/scoring
  输出 CJS（dist/），同时供 ts-node(CJS) 与 Taro webpack 消费
packages/ui/        预留
openspec/           spec-driven 规范（config.yaml + specs/ + changes/）
.opencode/          opencode 的 openspec skills/commands（由 openspec init 生成）
```

### 核心约定（违反必返工）
1. **业务代码禁止直调浏览器/小程序专有 API**（`wx.*`、`Taro.*` 副作用、`Audio`、`localStorage` 等），一律走 `packages/shared/platform` 适配层。Web 与小程序各提供实现，通过 `src/platform/index.ts` 用 Taro `#ifdef` 条件编译导出。
2. **前后端共享类型契约在 `packages/shared`**：DTO/枚举/Prisma 类型都从这里导出。`@app/shared` 必须先 `pnpm build` 生成 `dist/`，前端 Taro webpack 才能消费（不会走 babel 转译 node_modules 内的 TS 源）。
3. **shared 必须输出 CommonJS**（`package.json` 不要带 `"type": "module"`，`tsconfig` 用 `module: CommonJS`），因为 server 用 ts-node(CJS)。
4. **shared 源码内 re-export 用无扩展名**（`'./enum/index'` 而非 `'./enum/index.js'`），否则 ts-jest CJS resolver 报 `Cannot find module`。
5. **Conventional Commits**：feat/fix/docs/refactor/test/chore。

---

## 踩坑记录（按出现顺序）

### 1. pnpm 11 不读 package.json 里的 `pnpm` 字段
**症状**：`pnpm install` 报 `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild`，且 package.json 里的 `pnpm.onlyBuiltDependencies` 被 WARN 忽略。
**解决**：把 `onlyBuiltDependencies` 放到 `pnpm-workspace.yaml`，或全局 `pnpm config set dangerouslyAllowAllBuilds true`（本项目采用后者，写入全局 config）。
**教训**：pnpm 11 配置位置变了，看官方 settings 文档而非旧博客。

### 2. Taro CLI 找不到配置
**症状**：`taro build --type h5` 报 `找不到项目配置文件config/index`。
**解决**：配置必须叫 `config/index.ts`，不能叫 `taro.config.ts`（Taro CLI 硬编码找 `config/index`）。

### 3. Taro 配置 schema 严格
**症状**：`h5.postcss.autoprefixer 的取值为对象类型，不允许包含以下属性 'options'`。
**解决**：去掉 `options`、`selectorBlackList`、`namingConvention` 等 schema 不允许的子字段。改配置前先看报错清单。

### 4. 缺 babel-preset-taro 的传递依赖
**症状**：编译报 `Cannot find module '@babel/preset-react'` / `@babel/plugin-proposal-class-properties`。
**解决**：手动 `pnpm add -D @babel/preset-react @babel/plugin-proposal-class-properties @babel/plugin-proposal-decorators @babel/preset-env @babel/preset-typescript`。`babel-preset-taro` 没把它们列为 peer。

### 5. shared ESM 在 Taro webpack 里 import 失败
**症状**：H5 构建报 `export 'NotSupportedError' was not found in '@app/shared' (module has no exports)`。
**解决**：shared 必须预编译到 `dist/`，`package.json` 的 `exports` 指向 `dist/*.js`。Taro webpack 不会对 node_modules 内的 TS 源跑 babel。

### 6. ts-jest CJS resolver 不回查 `.js` → `.ts`
**症状**：jest 报 `Cannot find module './enum/index.js' from '../../packages/shared/src/index.ts'`。
**解决**：shared 源码内 re-export 一律用无扩展名（`'./enum/index'`）。这与「build 产物要 `.js` 扩展」无关——tsc 会自动补。

### 7. supertest 默认 import 形式失效
**症状**：`TypeError: request is not a function`。
**解决**：`import request from 'supertest'`（默认导入），不要 `import * as request`。

### 8. Refresh token 同秒撞唯一约束
**症状**：登录时 `prisma.refreshToken.create()` 报 `Unique constraint failed on (tokenHash)`。
**原因**：JWT payload 相同 → token 字符串相同 → sha256 哈希相同。
**解决**：refresh token 的 payload 加随机 `jti: \`${Date.now()}-${Math.random().toString(36).slice(2,12)}\``。

### 9. SQLite INT 装不下毫秒时间戳
**症状**：`Conversion failed: Value 1787027275115 does not fit in an INT column`。
**解决**：`clientTimestamp` 字段改 `BigInt`。Prisma SQLite 的 `Int` 是 32 位。生产换 Postgres 时可改 `BigInt` 或 `Int`（PG Int 是 64 位）。

### 10. GitHub PAT 推送被拒（403）
**症状**：`remote: Permission to sgfCrazy/Language-Learning.git denied`。
**原因**：fine-grained PAT 即使仓库勾选了，没单独把 `Contents` 权限设为 `Read and write`，git push 会被拒。API 的 `permissions.push: true` 反映的是账号能力，不是 token 能力。
**解决**：用 classic token（勾 `repo`），或 fine-grained PAT 单独设 Contents: Read and write。
**推送姿势**：用一次性 credential helper，不写入 git config 避免泄露 token：`git -c credential.helper='!f() { echo "username=<u>"; echo "password=<token>"; }; f' push -u origin main`。

### 11. Taro H5 构建不生成 index.html
**症状**：`pnpm build:h5` 后 `dist/` 只有 `js/` 和 `css/`，没有 `index.html`。
**原因**：Taro 4 H5 需要 HTML 模板文件 `src/index.html`，否则 HtmlWebpackPlugin 无模板。
**解决**：创建 `apps/web-taro/src/index.html`，内含 `<div id="app"></div>` 和 `<%= htmlWebpackPlugin.options.script %>` 占位符。

### 12. Taro H5 私有字段跨 chunk 报错
**症状**：Playwright 跑 H5 页面报 `Private field '#e' must be declared in an enclosing class`，页面空白。
**原因**：webpack 分 chunk 后，依赖包（@tarojs 等）中的 ES2022 私有字段跨 chunk 访问失败。
**解决**：在 `config/index.ts` 的 `h5.webpackChain` 里把这些依赖加入 `script` rule 的 `include`，强制 babel 转译掉私有字段：
```ts
webpackChain(chain) {
  chain.module.rule('script').include
    .add(/[\\/]node_modules[\\/]@tarojs/)
    .add(/[\\/]node_modules[\\/]@tanstack/)
    .add(/[\\/]node_modules[\\/]react-dom/)
    .add(/[\\/]node_modules[\\/]zustand/);
}
```

### 13. Taro H5 + Playwright 测试注意事项
**症状**：`getByText('去登录')` 超时找不到；`getByPlaceholder` 匹配到 2 个元素。
**原因**：
1. Taro H5 是 SPA，需 `waitForTimeout` 或等特定文本出现后才交互。
2. Taro 组件渲染为自定义元素：`<taro-button-core>` 不是 `<button>`（`getByRole('button')` 无效）；`<taro-input-core>` 包裹原生 `<input>`（`getByPlaceholder` 匹配到包装层+内层 input 两个）。
3. Taro H5 **堆叠所有页面在 DOM**（navigateTo 不销毁旧页），`textContent('body')` 拿到全部页面文本；但 `getByText` 默认只匹配可见元素，可安全使用。
4. `page.goBack()` 在多层 navigateTo 栈里路径不可靠，用 `page.goto('/')` 回首页更稳。
**解决**：用 `getByText` 替代 `getByRole('button')`；用 `page.locator('input[placeholder="..."]')` 精确选原生 input；用 `page.goto('/')` 重置导航。

---

## 迭代日志

### v0.1.0-bootstrap-mvp-foundation — 2026-08-18

**目标**：建立「登录 → 选课 → 连词成句练习 → 进度记录」端到端最小闭环，同时跑通 Web + 微信小程序双端。

**OpenSpec 提案**：`openspec/changes/bootstrap-mvp-foundation/`
- proposal.md / specs/{user-auth,practice-engine,course-catalog,progress-tracking}/spec.md / design.md / tasks.md
- 32/33 task 完成，仅 7.1（Playwright E2E 实跑）未勾选

**提交**（5 个）：
| commit | 说明 |
| --- | --- |
| 0c751c7 | chore(openspec): init project with openspec specs and 6 MVP changes |
| 49cc5d1 | feat(infra): monorepo skeleton (pnpm + Taro4 + NestJS + shared) |
| 7d83a74 | feat(data): prisma schema + seed + tokenize util |
| 9002f32 | feat(auth): user-auth capability (email + WeChat + JWT) |
| 0174ee3 | feat(catalog+practice+progress): three remaining capabilities |

**已落地的能力域**
| 能力 | 后端 | 前端 | 测试 |
| --- | --- | --- | --- |
| user-auth | ✅ 邮箱注册/登录、微信小程序登录、Web 扫码(qrcode/poll/callback)、JWT access+refresh 旋转+登出吊销 | ✅ 登录页、auth store、平台适配 Web/小程序双实现 | ✅ 6 e2e |
| practice-engine | —（纯前端 + shared 纯函数） | ✅ 连词成句练习页（累加拼接、点选判定、即时反馈、中译英、跳过、音效/震动走适配层）| ✅ tokenize 4 + scoring 6 单测 |
| course-catalog | ✅ 商城筛选/搜索/分页、详情、加入学习、句子懒加载、进度读写 | ✅ 商城页、课程详情页 | ✅ 8 e2e |
| progress-tracking | ✅ 记录去重(clientTimestamp 唯一)、热力图、成长曲线、连续打卡、课程详情 | ✅ 成长页、离线补传队列 | ✅ 5 e2e |

**测试基线**：后端 Jest 19/19、shared Vitest 11/11、web Vitest 1/1，typecheck 全绿。
**构建基线**：`pnpm -F @app/web-taro build:h5` 与 `build:weapp` 均通过。

**已知的临时偏离（部署前需修）**
1. **数据库**：本地 dev 用 SQLite（无 Postgres/Docker）。生产部署把 `apps/server/prisma/schema.prisma` 的 `datasource.provider` 改回 `"postgresql"` 并重新 migrate。SQLite 不支持 Prisma enum，所以 schema 全用 String + 应用层枚举校验——切 PG 后可选择性引入 enum。
2. **Refresh 吊销存储**：spec/design 写的 Redis，本期用 Prisma `RefreshToken` 表实现（行为符合 UA-003）。部署有 Redis 时把 `AuthService` 的吊销逻辑迁到 Redis（tokenHash 为 key）。
3. **Web 扫码 ticket 暂存内存**：`AuthController` 里用 `Map` 存 ticket→code，仅单实例开发用。多实例部署需迁到 Redis。

**未完成项**
- Task 7.1：Playwright E2E 脚本与 `playwright.config.ts` 已就绪，但未实跑。需先 `pnpm -F @app/web-taro e2e:install`（下载 chromium）并启动后端，再 `pnpm e2e`。
- Task 7.2：小程序端需在微信开发者工具按 `apps/web-taro/MINIAPP_CHECKLIST.md` 手工验收。
- 微信真实凭证：`.env` 里 `WX_APPID/WX_SECRET` 是占位，需填真实值才能跑通微信登录。
- 远端仓库未推送成功：`https://github.com/sgfCrazy/Language-Learning.git` 已 add remote，但 PAT 缺 Contents 写权限（见踩坑 #10）。需用户重新生成有 repo 权限的 token。

**下一步建议**
1. 解决 PAT 权限，把代码推到远端。
2. 实跑 7.1 E2E 并勾选。
3. 部署前完成三项临时偏离修正（PG / Redis / Redis）。
4. 进入下一个 change：建议顺序 `gamification` → `review-system` → `ai-assistant` → `media-courses` → `pk-battles`（见 README 变更路线表）。每个 change 用 `/opsx-propose` 补 design/tasks，再 `/opsx-apply`。

---

### v0.2.0-gamification — 2026-08-18

**目标**：GamePlay 外壳 —— 金币经济 + 连击 + 排行榜 + 每日任务，提升练习参与度。

**OpenSpec 提案**：`openspec/changes/gamification/`，已归档为 `2026-08-18-gamification`。

**已落地的能力域**
| 能力 | 后端 | 前端 | 测试 |
| --- | --- | --- | --- |
| gamification | ✅ CoinTransaction + DailyTask 表、练习结算发币（首答成功加成、连击加成、评级加成）、任务进度（练习次数/金币/连击/时长/完成任务）、排行榜（日/周/月，仅完成 ≥5 题的活跃用户） | ✅ 练习页连击计数器、任务中心页、排行榜页 | ✅ gamification e2e 5 例（server 23/23） |

**关键提交**：`ea9f6d5`（gamification capability）。

---

### v0.3.0-review-system — 2026-08-18

**目标**：间隔重复复习 —— 生词本 + 每日复习本 + SM-2 调度，让词汇从"认识"走向"掌握"。

**OpenSpec 提案**：`openspec/changes/review-system/`，已归档为 `2026-08-18-review-system`。

**已落地的能力域**
| 能力 | 后端 | 前端 | 测试 |
| --- | --- | --- | --- |
| review-system | ✅ SM-2 纯函数（shared/review.ts）；ReviewModule：生词本 CRUD + 掌握/取消 + 每日复习推荐（答错句子 + 到期词）；ProgressService 结算后自动喂给调度器 | ✅ 练习页"标记生词"、复习本页（当日到期 + 一键进练习）、生词本页（添加/删除/移入掌握） | ✅ shared 7 单测 + review e2e 5 例（server 28/28） |

**关键提交**：`5520bad`（review system capability + 归档 review-system + 同步主 spec）。

**沿途踩坑**（新增）
- #14 review controller 里同路由同时挂 `@Delete` 与 `@Post` 别名：前端 network client 不支持 DELETE，用 `/`:id`/delete` POST 别名兜底，两者都挂同一 handler。
- #15 TS4053：`GrowthRow` 未导出导致 controller 返回类型无法命名 —— 改成 `export interface GrowthRow`。

---

### v0.4.0-ai-assistant — 2026-08-18

**目标**：练习页内嵌 AI 问答助手，自动附句子上下文，解答语法/用法疑问，降低心流中断。

**OpenSpec 提案**：`openspec/changes/ai-assistant/`，已归档为 `2026-08-18-ai-assistant`。

**已落地的能力域**
| 能力 | 后端 | 前端 | 测试 |
| --- | --- | --- | --- |
| ai-assistant | ✅ OpenAI 兼容 LLM 客户端（env 配 GLM，无 key fallback）；AiAskLog 表；每日 2 次免费，超出扣 50 金币（spendCoins 负向流水）；PII 拒绝 | ✅ 练习页 AiAssistantPanel（提问输入、回答展示、剩余额度提示、余额不足提示） | ✅ shared 8 单测 + ai e2e 5 例（server 33/33） |

**注意**：钻石暂以金币记账（无独立钻石账本，见 design D3/D4）；LLM 靠 `LLM_API_KEY` 环境变量，未配置时返回 fallback 文案。
**关键提交**：`601ce34`（ai-assistant capability）。

**沿途踩坑**（新增）
- #16 先测"答对一次赚 5 金币，却扣 50"导致 403：测试前先构造足够金币（多次 SSS 练习）。
- #17 `$transaction` 内调用 `GamificationService.spendCoins`（走同一 prisma 实例，SQLite 事务嵌套/锁冲突超时）：改为先写 AiAskLog 再单独扣款。
- #18 `AI_LLM_CLIENT` 符号在 module 与 llm.client 重复声明 + service 注入错 token：统一用 `llm.client` 导出的注入标记。

---

### v0.5.0-media-courses — 2026-08-18

**目标**：音频/视频/音乐课程按句切片播放 + 听写/听力/口语测评落地，拓展真实语料学习场景。

**OpenSpec 提案**：`openspec/changes/media-courses/`，已归档为 `2026-08-18-media-courses`。

**已落地的能力域**
| 能力 | 后端 | 前端 | 测试 |
| --- | --- | --- | --- |
| media-courses | ✅ `GET /media/audio/:id` 服务端合成 WAV（开发期媒体占位）；`POST /media/speech-score` 确定性 0-100 评分（SPEECH_API_KEY 预留）；seed 增加 audio + music 课程（带 mediaUrl/startMs/endMs 分句切片） | ✅ PlatformAdapter 新增 `media` 播放抽象（Web HTML5 / 小程序 innerAudio）；练习页模式切换条 + 听写（播放/慢速/拼句）+ 三阶段听力（盲听→慢听→字幕）+ 口语（录音→评分） | ✅ speaking 4 单测 + media e2e 5 例（server 38/38） |
| practice-engine | PE-004 四模式可用（模式切换保存进度） | | |
| course-catalog | CC-001 媒体字段与类型（已存在）| 课程列表显示类型 | |

**注意**：WAV 为开发期占位音（不同句不同音高便于听辨），生产换对象存储/CDN 真实音频，字段结构不变。
**关键提交**：`caac546`（media-courses capability）。
**沿途踩坑**（新增）
- #19 seed 的 mediaUrl 依赖 sentence id：先 create 再按 rec.id update 填充 `/api/v1/media/audio/<id>`。
- #20 小程序 adapter 的 `Taro.InnerAudioContext` 类型不可用：用 `any` 局部变量绕过 TS18047。
- #21 相对媒体 URL（`/api/v1/...`）在 H5 Audio 里无法直接播放：前端 `resolveMediaUrl()` 拼上 API_BASE。

---

### v0.6.0-pk-battles — 2026-08-18

**目标**：1v1 实时 PK —— 公开/私密房间、随机匹配、实时答题同步、服务端判定、积分榜。

**OpenSpec 提案**：`openspec/changes/pk-battles/`，已归档为 `2026-08-18-pk-battles`。

**已落地的能力域**
| 能力 | 后端 | 前端 | 测试 |
| --- | --- | --- | --- |
| pk-battles | ✅ PkRoomStore（进程内 Map，房间状态机 + 匹配队列 + 私密 6 位码）；PkService（建房/加入/随机匹配/抽题/答案判定/结算入库）；原生 WebSocket 网关 `/ws/pk`（统一 JSON 事件协议）；PkMatch 战绩表 + 积分榜 | ✅ 大厅页（公开房间列表、创建公开/私密、随机匹配、房间号加入）；对战页（题目候选词、计时、对手实时比分、结果结算） | ✅ pk 5 单测 + pk e2e 5 例（server 43/43） |

**注意（偏离 spec 的决策）**：
- 实时通道用**原生 WebSocket**（`ws` + `@nestjs/platform-ws` 弃用），因为 Socket.io 协议不与小程序 `Taro.connectSocket` 互通；统一 JSON 协议在 shared 满足 PK-005 意图。落地后移除了 @nestjs/websockets 依赖。
- **WS 网关是轮询式**：房间状态靠前端 `question/progress/result` 事件驱动，非自动推送超时判定（超时依赖客户端发送 next_question 触发）。
- **进程内 Map** 房间/匹配队列仅单实例有效，生产需迁 Redis。
- **WS 连接鉴权**：仅从 query `userId` 关联身份，未验证 token（HTTP 层已校验后进入才可靠；生产需加固）。

**关键提交**：`628d444`（pk-battles capability）。
**沿途踩坑**（新增）
- #22 `@nestjs/websockets` 默认驱动要 socket.io，未安装会崩所有 e2e（PackageLoader 报错）：改自建 `WebSocketServer({ server, path })` + `HttpAdapterHost` 拿 http server，完全脱离框架网关。
- #23 小程序 `Taro.connectSocket` 返回 Promise 而非 SocketTask：需先 `await` 再绑 onMessage。
- #24 主 spec 用 `## MODIFIED Requirements` 头导致 openspec 校验失败（review-system 遗留）：主 spec 必须用 `## Requirements`。
- #25 practice-engine 的 pk-battles delta 与 media-courses（已实现全部模式）冲突：只合入"对战单题下发"场景，保留全部模式入口。

---

## 待实施的 OpenSpec Changes（设计已就绪，未实现）

（全部 6 个 changes 已完成并归档，列表清空）

| Change | proposal | spec delta | design/tasks | 说明 |
| --- | --- | --- | --- | --- |
| bootstrap-mvp-foundation | ✅ | ✅ | ✅/✅ | 见上，已实施 32/33 |
| gamification | ✅ | ✅ | —/— | 连击/SSS/金币/每日任务/排行榜 |
| review-system | ✅ | ✅ | —/— | 复习本/生词本/掌握列表/动态间隔 |
| pk-battles | ✅ | ✅ | —/— | 1v1 实时对战（Socket.io + 小程序 WebSocket） |
| ai-assistant | ✅ | ✅ | —/— | 学习页内嵌 AI 问答（配额、上下文感知） |
| media-courses | ✅ | ✅ | —/— | 音频/视频/音乐课程 + 跟读跟拼 |

实施某个 change 前用 `/opsx-propose <id>` 让它补全 design.md 与 tasks.md。

---

## 常用命令速查

```bash
# 安装
pnpm install

# 数据库
pnpm -F @app/server prisma:migrate    # 生成迁移
pnpm seed                              # 灌种子数据

# 开发
pnpm dev:server                        # 后端 :3000
pnpm dev:web                           # Taro H5
pnpm dev:weapp                         # Taro 微信小程序（用微信开发者工具打开 dist/）

# 质检
pnpm -r typecheck
pnpm -r test
pnpm lint
pnpm -F @app/web-taro e2e              # Playwright（需先 e2e:install）

# OpenSpec
openspec list                          # 列 changes
openspec list --specs                  # 列主 specs
openspec show <change>
openspec validate <change> --strict
openspec status --change <change>
# opencode 内：/opsx-propose /opsx-apply /opsx-archive /opsx-sync /opsx-explore /opsx-update

# 构建
pnpm -F @app/web-taro build:h5
pnpm -F @app/web-taro build:weapp
```
