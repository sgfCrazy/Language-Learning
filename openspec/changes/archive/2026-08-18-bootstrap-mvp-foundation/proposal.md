## Why

平台从零起步，需要先建立"能登录、能选课、能练习、能记录进度"的端到端最小闭环。
没有这层地基，游戏化、PK、AI 助手、音视频跟练等上层能力都无法落地。本期奠定 MVP
的骨架，让用户在 Web 与微信小程序上完成"登录 → 挑课 → 连词成句练习 → 看到进度"全流程。

## What Changes

- 新建 monorepo（pnpm workspaces）：`apps/web-taro`（Taro 跨端：Web/H5 + 微信小程序）、`apps/server`（NestJS）、`packages/shared`、`packages/ui`。
- **BREAKING**（首次定义，无既有行为）：确立多端平台适配层 `packages/shared/platform`，禁止业务代码直调浏览器/小程序专有 API。
- 用户认证：微信登录（小程序 `wx.login` + Web 微信扫码）为主，邮箱密码为辅；签发 JWT。
- 练习引擎：实现"连词成句"核心玩法与中译英模式；句子分词拆解、逐步拼接、即时反馈、按句评分；支持模式切换骨架（听写/听力/口语/视频先留接口，二期能力填充）。
- 课程目录：课程包/课程/句子的数据模型与 CRUD；课程商城列表、详情、加入学习；进度持久化。
- 进度追踪：记录每次练习（每题对错、用时、尝试次数）；学习热力图、成长曲线、课程详情的基础数据接口。
- 共享类型契约：前后端共用 DTO/枚举（练习模式、评级、请求响应），由 `packages/shared` 导出。

## Non-goals

- 不做连击动画/SSS 评级展示/金币/每日任务/排行榜（归 `gamification` change）。
- 不做复习本/生词本/动态间隔复习（归 `review-system` change）。
- 不做 PK 实时对战（归 `pk-battles` change）。
- 不做 AI 智能助手（归 `ai-assistant` change）。
- 不做音视频/音乐课程播放与跟读跟拼（归 `media-courses` change）。
- 不做编辑端做课程（归 `course-editor` 二期 change）。
- 不做支付/会员体系（后续 change）。

## Capabilities

### New Capabilities

- `user-auth`: 账号与登录（微信登录 + 邮箱密码 + JWT 会话）
- `practice-engine`: 连词成句练习引擎（拆句/拼接/反馈/评分 + 中译英模式 + 模式切换骨架）
- `course-catalog`: 课程包与商城（数据模型、列表、详情、加入学习、进度持久化）
- `progress-tracking`: 成长记录与学习分析（练习记录、热力图、成长曲线、课程详情）

### Modified Capabilities

（无，本期为初始建立）

## Impact

- 新增代码库骨架：pnpm workspace、ESLint/Prettier/Vitest/Jest/Playwright 配置、CI 基础。
- 新增后端：NestJS 模块（auth、courses、practice、progress）、Prisma schema、PostgreSQL/Redis 依赖。
- 新增前端：Taro 工程配置（Web + 小程序双构建）、平台适配层、状态/请求封装。
- 外部依赖：微信开放平台凭证（小程序 AppID + Web 扫码）、对象存储桶（本期仅存图片/音频占位）。
- API 契约：首批 REST 端点 + JWT 鉴权；前端通过 TanStack Query 消费。
