## Context

已有排行榜（异步聚合）与金币体系。本期加 1v1 实时 PK：创建公开/私密房间、随机匹配、实时同步答题、
服务端判定胜负、PK 积分榜。Web 用 Socket.io、小程序用 WebSocket 适配层，事件协议定义在 shared（PK-005）。
生产需 Redis 管理房间/匹配队列；开发期无 Redis，用进程内 Map 实现（单实例限制，见 Risk）。

## Goals / Non-Goals

**Goals:**
- PK-001：公开房间（进大厅可加入）+ 私密房间（房间号/邀请链接），可选题集与题数。
- PK-002：随机匹配（两人配对 / 超时提示）。
- PK-003：双方同步收题、实时看对手进度、单题先正确提交得分更高、服务端时序判定。
- PK-004：战绩入库 + PK 积分榜。
- PK-005：shared 定义统一事件协议；Web Socket.io、小程序 WebSocket 适配层，两端一致。

**Non-Goals:**
- 不做多人（>2）对战、观战/回放。
- 不做高级反作弊（本期服务端判时序）。
- 不做 Redis 部署（开发期进程内 Map，见 Risk）。

## Decisions

### D1: 房间状态机与匹配队列放进程内 Map
`PkRoomStore`：`Map<roomId, PkRoom>` + `MatchQueue[]`（排队用户）。单实例有效，生产迁 Redis。
房间状态：`waiting → ready → playing → finished`。私密房间生成 6 位房间号。

### D2: 服务端判定时序（PK-003）
每题下发 `{question, timeLimitMs}`。服务端按事件到达顺序判定：先正确者 +10，后正确者 +5，答错/超时 0。
对手实时状态经 WS 推送 `opponent_progress`。结算在服务端完成并落库。

### D3: 统一事件协议放 shared
`packages/shared/src/pk.ts` 定义：事件名常量、`PkEventMap`（create_room/join/match/progress/result…）、
`PkQuestion`、`PkRoomSnapshot`、`PkResult` 类型 + 纯函数 `scorePkAnswer(order)`、`pickPkQuestions(courseId,n)`。
Web Socket.io 与小程序 WebSocket 均按此协议序列化 JSON。

### D4: 战绩表 PkMatch
`PkMatch`：roomId、playerAId/playerBId、scoreA/scoreB、winnerId、mode、coursePackId、题数、createdAt。
积分榜用 Prisma `groupBy` 聚合 win 数与得分（dev 无 Redis，与排行榜同策略）。

### D5: practice-engine delta
复用中译英判定逻辑但以"限时单题"下发：PK 房间从所选课程包抽题，一次只发一题，
判定 `{sentenceId, correct, elapsedMs}`，不写常规练习进度（PK 战绩单独入库）。

## Risks / Trade-offs

- [单实例内存态] → 多实例需 Redis 迁移（房间/匹配队列/积分），本期 Map 仅开发用。
- [WS 适配层两套实现] → 协议统一在 shared，Web 与小程序各自实现 socket 连接，靠类型保证载荷一致。
- [抽题范围] → 从用户已加入的课程包随机抽题；未加入则用首个公开课程包。

## Migration Plan

- Prisma 加 `PkMatch` 表，`prisma migrate dev`。
- 新增 shared `pk.ts` 与 ws 适配层。
- 无需迁移旧数据。