## Context

全新项目，无既有代码。本期要打通"登录 → 选课 → 连词成句练习 → 进度记录"的端到端最小闭环，
并同时产出 Web 与微信小程序两端的可运行骨架。约束：业务代码不得直接调用浏览器/小程序专有
API；前后端共享类型契约；实时能力（PK）与非中译英模式不在本期。详见 proposal.md 的 Why。

## Goals / Non-Goals

**Goals:**
- 建立可长期演进的 monorepo 与多端平台适配层，避免后续重写。
- 定义稳定的 API 契约（DTO/枚举在 `packages/shared`），前端、后端、未来编辑端共用。
- 用最薄实现满足 4 个 capability 的 spec，确保端到端可演示。
- 数据模型预留扩展（媒体引用、复习队列、对战）但不实现其逻辑。

**Non-Goals:**
- 不优化性能/规模（暂无缓存层之外的复杂优化）。
- 不做 CI/CD 完整流水线，仅留配置与单测入口。
- 不做对象存储的直传/分片，本期仅服务端代理上传图片。

## Decisions

### D1: pnpm workspaces monorepo
选 pnpm workspaces 而非 Nx/Turbo：本期规模小，pnpm 原生 workspaces + `turbo` 按 needs 引入。
- 替代方案：Nx（过重）；单独多仓（共享类型痛苦）。
- 目录：`apps/web-taro`、`apps/server`、`packages/shared`、`packages/ui`、`packages/shared/platform`。

### D2: Taro 4 跨端而非 Web + 原生小程序双工程
一套 React/TS 代码同时产出 Web/H5 与微信小程序，复用业务与状态逻辑。
- 替代方案：Web(Next.js) + 原生小程序双工程（重复实现两套 UI 逻辑，维护成本高）。
- 替代方案：uni-app（Vue 生态，与团队 React 偏好不符）。
- 代价：受 Taro 编译限制，部分 Web 库在小程序不可用，需走适配层（见 D4）。

### D3: 平台适配层 `packages/shared/platform`
封装音频播放、录音、震动、本地存储、网络请求、登录凭证获取等平台能力，导出统一接口。
- 业务代码只依赖接口，编译期由 Taro 端与 Web 端各注入实现。
- 替代方案：到处 `process.env.TARO_ENV` 判断（散落、易漏）。

### D4: 后端 NestJS + Prisma + PostgreSQL + Redis
NestJS 模块化清晰；Prisma 提供类型安全 ORM 与 `packages/shared` 共用类型。
Redis 用于 refresh token 吊销、离线记录去重、未来对战/排行榜。
- 替代方案：Express 裸写（缺乏模块边界）；TypeORM（类型生成弱于 Prisma）。

### D5: 认证设计
- 小程序：`wx.login` → code → 后端调微信 `jscode2session` → openid → 签 JWT。
- Web：微信扫码 OAuth（生成二维码 → 轮询/长轮询确认）→ openid/unionid → JWT。
- 邮箱：bcrypt 哈希。
- JWT：access（15min）+ refresh（30d，存 Redis 可吊销）。
- 多端会话：JWT payload 带 `client` 字段（web/miniapp），同一用户多 token 并存。

### D6: 句子拆解与拼接数据结构
`Sentence { id, courseId, order, text, translation, tokens: Token[], mediaRefs? }`
`Token { id, text, isPunctuation }`，`tokens` 数组顺序即正确顺序。
拼接过程纯前端驱动（按 index 递进展示），服务端只存拆解结果与判定规则。
评分由前端按公式计算并随练习记录上报，服务端做轻校验（防止明显作弊）。

### D7: 离线记录补传与去重
小程序离线时本地缓存练习记录（适配层 storage），恢复后批量上报；
服务端用 `(userId, sentenceId, clientTimestamp)` 去重。本期不做复杂冲突合并。

### D8: API 风格
REST + 版本前缀 `/api/v1`；错误统一 `{ code, message, details? }`。
未来 PK 用 Socket.io（Web）+ 小程序 WebSocket 适配（不在本期）。

## Risks / Trade-offs

- [Taro 对某些 Web 生态库不兼容] → 通过适配层与 `process.env.TARO_ENV` 隔离，必要时为小程序写替代实现。
- [一套代码两端体验可能互相妥协] → 接受布局差异，关键交互（判定/反馈时机）保持一致即可。
- [Prisma 在 monorepo 生成位置] → `schema.prisma` 放 `apps/server`，生成类型再导出到 `packages/shared` 供前端引用。
- [微信扫码登录需备案域名] → 本期开发用内网穿透/测试号，正式域名待定（Open Question）。
- [评分在前端计算可被篡改] → 本期接受，服务端做范围校验；排行榜/对战期再加强服务端判定。

## Migration Plan

- 全新项目无迁移。部署顺序：后端 + DB/Redis → Web 构建 → 小程序提审。
- 回滚：后端容器化，按版本镜像回滚；小程序按版本回退（受微信审核限制）。

## Open Questions

- 正式域名与微信扫码登录的备案主体？影响 Web 上线时间，不影响 spec 与任务拆分。
- 对象存储选 OSS 还是 COS？影响配置，本期仅需一个 S3 兼容实现，可后定。
