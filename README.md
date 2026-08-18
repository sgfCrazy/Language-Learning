# Language Learning（语言学习平台）

"句乐部"风格的英语学习平台：核心玩法是「连词成句」——看中文/听音频，把英文句子一步步拼出来，
过程中单词自然重复从而记住。游戏化（连击/SSS 评级/PK/排行榜）为核心体验。
支持音视频/音乐课程的跟读与跟拼。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + MUI
- **后端**：NestJS + Prisma + SQLite（本地）/ PostgreSQL（生产）+ Redis
- **AI**：外部 LLM API（OpenAI / 智谱 GLM）
- **存储**：对象存储（OSS/COS）放音视频
- **认证**：邮箱密码为主，JWT
- **工程**：pnpm workspaces monorepo

## 目录

```
apps/web-react      Web 前端（React + MUI + Vite，SPA）
apps/server         NestJS 后端
packages/shared     共享类型 / 平台适配层接口
openspec/           spec-driven 开发规范（specs + changes）
```

## 项目管理：OpenSpec

本项目采用 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 进行 spec-driven 开发。

- `openspec/specs/`：当前系统的主 spec（由 change 归档后生成）
- `openspec/changes/<change-id>/`：变更提案，包含 `proposal.md` / `specs/` / `design.md` / `tasks.md`
- `openspec/config.yaml`：项目上下文（技术栈、约定、能力域）

### 变更路线（MVP）

| Change | 状态 | 说明 |
| --- | --- | --- |
| `bootstrap-mvp-foundation` | 已提案（含 tasks） | 地基：user-auth + practice-engine + course-catalog + progress-tracking |
| `gamification` | 已提案 | 连击 / SSS 评级 / 金币 / 每日任务 / 排行榜 |
| `review-system` | 已提案 | 复习本 / 生词本 / 掌握列表 / 动态间隔复习 |
| `pk-battles` | 已提案 | 1v1 实时对战房间 / 匹配 / 积分 |
| `ai-assistant` | 已提案 | 学习页内嵌 AI 问答（上下文感知、配额） |
| `media-courses` | 已提案 | 音频/视频/音乐课程 + 跟读跟拼 |

> 实施顺序建议：bootstrap → gamification → review-system → ai-assistant → media-courses → pk-battles

### 常用命令

```bash
openspec list                      # 列出所有 changes
openspec list --specs              # 列出主 specs
openspec show <change>             # 查看某 change
openspec validate <change> --strict# 校验
openspec status --change <change>  # 查看 change 进度
```

OpenCode 内可用 `/opsx-propose`、`/opsx-apply`、`/opsx-archive`、`/opsx-sync`、`/opsx-explore`、`/opsx-update`。

## 工作流

1. **提案**：`openspec new change <id>` → 写 proposal/specs/design/tasks（或 `/opsx-propose`）。
2. **应用**：`/opsx-apply` 按 tasks.md 实现，勾选复选框。
3. **归档**：`openspec archive <id>` 将 spec delta 合并进 `openspec/specs/`。

## 开发约定

- Conventional Commits（feat/fix/docs/refactor/test/chore）
- ESLint + Prettier，TypeScript strict
- 测试：后端 Jest + supertest；前端 Vitest；E2E Playwright（Web）
- 前端须走 `packages/shared/platform` 适配层访问平台能力（禁止直调浏览器 API 做副作用）
