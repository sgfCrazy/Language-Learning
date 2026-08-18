## 1. 共享层：PK 协议与纯函数

^- [x] 1.1 `shared/src/pk.ts`：事件协议类型（PkEventMap）、PkQuestion、PkRoomSnapshot、PkResult、`scorePkAnswer` — shared — 验收：单测覆盖
^- [x] 1.2 `shared/test/pk.test.ts` — shared — 验收：vitest 全过

## 2. 后端 PkModule

^- [x] 2.1 Prisma `PkMatch` 表 + migrate — server — 验收：schema 生效
^- [x] 2.2 `PkRoomStore`：房间 CRUD + 私密房间号 + 匹配队列 — server — 验收：单测/集成
^- [x] 2.3 `PkService`：建房间/加入/匹配/抽题/判定/结算入库 — server — 验收：supertest 覆盖
^- [x] 2.4 `PkGateway`（Socket.io）：实时推送双方题目/对手进度/结果 — server — 验收：集成测试验证事件序列
^- [x] 2.5 `PkController`：`POST /pk/rooms`、`GET /pk/rooms`、`POST /pk/rooms/:id/join`、`GET /pk/rooms/:id`、`POST /pk/match`、`POST /pk/match/cancel`、`GET /pk/leaderboard` — server — 验收：supertest 覆盖
^- [x] 2.6 pk e2e `test/pk.e2e-spec.ts` — server — 验收：jest 全绿

## 3. 前端 PK

^- [x] 3.1 shared 平台适配层加 `realtime`（Web socket.io-client / 小程序 wx.connectSocket 封装，统一事件协议）— web/miniapp — 验收：typecheck 通过
^- [x] 3.2 PK 大厅页：公开房间列表、创建房间、随机匹配、输房间号加入 — web/miniapp — 验收：页面渲染
^- [x] 3.3 PK 对战页：显示题目与候选词、计时、对手实时进度、结算结果 — web/miniapp — 验收：页面渲染、typecheck 通过

## 4. 测试与归档

^- [x] 4.1 `openspec validate pk-battles --strict` 通过 — shared — 验收：校验无错误
^- [x] 4.2 全仓 typecheck + test 全绿 — shared — 验收：无错误