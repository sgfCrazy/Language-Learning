## Purpose

提供 1v1 实时英语对战能力，让两名用户同步比拼答题速度与准确度，引入强社交竞争与传播。

## ADDED Requirements

### Requirement: PK-001 房间类型与创建

系统 SHALL 支持公开房间（任何用户可加入）与私密房间（仅凭房间号/邀请可加入）。创建者可选择题目集（课程包/随机）与题数。

#### Scenario: 创建公开房间
- **WHEN** 用户创建公开房间
- **THEN** 房间进入大厅列表，任何用户可加入

#### Scenario: 创建私密房间
- **WHEN** 用户创建私密房间
- **THEN** 系统生成房间号/邀请链接，仅持有人可加入

### Requirement: PK-002 随机匹配

系统 SHALL 提供随机匹配，按可用性将两名寻求对战的用户配对进入房间。

#### Scenario: 两人同时匹配
- **WHEN** 两名用户同时发起随机匹配
- **THEN** 系统 SHALL 在短时间窗口内配对并创建对战房间

#### Scenario: 匹配超时
- **WHEN** 一段时间内未找到对手
- **THEN** 系统 SHALL 提示匹配超时并可重试

### Requirement: PK-003 实时同步对战

对战双方 SHALL 同步收到题目，实时看到对方答题进度（已答/正答/答错），单题先正确提交者得分更高。系统 MUST 以服务端时序判定，防止客户端作弊。

#### Scenario: 双方同步开题
- **WHEN** 房间两人就绪
- **THEN** 服务端同时向双方下发第一题并开始计时

#### Scenario: 实时显示对手状态
- **WHEN** 一方提交答案
- **THEN** 对方 SHALL 实时收到该方本题状态更新

#### Scenario: 服务端判定胜负
- **WHEN** 所有题目完成或时间到
- **THEN** 系统 SHALL 按服务端记录的时序与正确性结算胜负

### Requirement: PK-004 积分与战绩

系统 SHALL 记录每场 PK 的胜负、得分、对手，并计入 PK 积分榜。

#### Scenario: 对战结束记录战绩
- **WHEN** 一场对战结束
- **THEN** 系统为双方各写入一条战绩并更新 PK 积分

### Requirement: PK-005 多端实时协议一致

Web SHALL 使用 Socket.io，微信小程序 SHALL 使用 WebSocket 适配层，两端 SHALL 使用统一的事件协议（事件名、载荷结构相同），定义在 `packages/shared`。

#### Scenario: 跨端对战
- **WHEN** 一方为 Web、一方为小程序
- **THEN** 双方对战流程与判定结果与同端对战一致
