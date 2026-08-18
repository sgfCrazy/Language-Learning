## Why

排行榜之外需要实时对抗才能形成强社交黏性。1v1 PK 让用户比拼"又快又准"，是平台最有传播力的玩法。需要实时房间与低延迟判定。

## What Changes

- PK 房间：公开房间（等人挑战）与私密房间（好友对战）。
- 实时 1v1：双方同步答题进度，实时显示对手状态，先到正确得分。
- 匹配与邀请：随机匹配或好友邀请链接/房间号。
- 结果与积分：胜负计入 PK 积分榜。
- 多端实时：Web 用 Socket.io，小程序用 WebSocket 适配层，统一事件协议。

## Non-goals

- 不做多人（>2）对战（后续）。
- 不做观战/回放（后续）。
- 不做反作弊的高级行为分析（本期仅服务端判时序）。

## Capabilities

### New Capabilities

- `pk-battles`: 1v1 实时 PK 对战房间、匹配、邀请、实时同步与积分

### Modified Capabilities

- `practice-engine`: 提供对战专用的题目下发与判定接口（限时、单题计分）

## Impact

- 后端新增 `PkModule` + Socket.io 网关（Web）+ 小程序 WebSocket 适配。
- Redis 管理房间状态与匹配队列。
- 前端 PK 大厅、房间、对战页、结果页。
- 实时事件协议需在 `packages/shared` 定义并跨端共用。
