## Purpose

通过连击、评级、金币、每日任务与排行榜，将练习过程游戏化，提升即时反馈爽感与长期留存，并引入社交竞争。

## Requirements

### Requirement: GM-001 连击系统

系统 SHALL 在练习中维护连击数：连续答对累加，答错重置为 0。连击数 SHALL 影响得分加成（20 连击翻倍，阶梯式递增）。连击触发时 SHALL 给出 Perfect/Great 视觉与音效反馈（经适配层）。

#### Scenario: 连续答对累加连击
- **WHEN** 用户连续答对题目
- **THEN** 连击数递增，达到阈值时分数加成按阶梯提升

#### Scenario: 答错重置连击
- **WHEN** 用户答错
- **THEN** 连击数重置为 0，加成取消

### Requirement: GM-002 SSS 评级

系统 SHALL 在练习结束时按得分率给出评级 C→B→A→S→SS→SSS，SSS 需得分率 ≥95%。评级规则跨端一致，由 `packages/shared` 纯函数计算。

#### Scenario: 高得分率获 SSS
- **WHEN** 用户得分率 ≥95%
- **THEN** 评级为 SSS

#### Scenario: 边界评级
- **WHEN** 得分率恰为评级分界点
- **THEN** 系统 SHALL 按就高原则给出评级

### Requirement: GM-003 金币与每日任务

系统 SHALL 发放金币：完成练习、达成连击、完成每日任务。每日任务列表每日刷新，完成状态持久化。

#### Scenario: 完成每日任务
- **WHEN** 用户完成当日某任务条件
- **THEN** 系统标记任务完成并发放对应金币

#### Scenario: 金币账本可查
- **WHEN** 用户查看金币明细
- **THEN** 系统返回收支流水

### Requirement: GM-004 排行榜

系统 SHALL 提供学习时长榜、积分榜，并支持周/月/总榜。榜基于 Redis zset，按用户维度聚合。

#### Scenario: 查询周榜
- **WHEN** 用户查询本周积分榜
- **THEN** 系统返回本周积分 top 用户列表与自己的排名

#### Scenario: 跨端一致
- **WHEN** Web 与小程序查询同一榜单
- **THEN** 两端返回一致的数据
