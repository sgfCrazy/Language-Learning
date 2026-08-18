## Purpose

提供"连词成句"核心练习玩法与多种学习模式的引擎，将句子拆解为词块、引导用户逐步拼接、给出即时反馈并按句评分，是平台学习体验的核心。

## ADDED Requirements

### Requirement: PE-001 句子拆解为词块

系统 SHALL 将每个英文句子拆解为有序词块（word/token），并保留正确顺序，用于连词成句练习。拆解结果 MUST 可被前端用于逐步拼接展示。

#### Scenario: 拆解普通句子
- **WHEN** 课程制作/导入一个英文句子 "I like to eat apples."
- **THEN** 系统将其拆解为词块序列 `["I", "like", "to", "eat", "apples", "."]` 并持久化正确顺序

#### Scenario: 保留标点
- **WHEN** 句子包含标点
- **THEN** 标点 SHALL 作为独立词块参与拼接，最终拼接结果需与原句一致才算正确

### Requirement: PE-002 连词成句逐步拼接

系统 SHALL 引导用户按"累加式"拼接句子：每次把下一个词块追加到已拼部分，形成递进片段。同一词块在拼接过程中自然重复出现。

#### Scenario: 逐步拼接过程
- **WHEN** 用户练习 "I like to eat apples."
- **THEN** 系统依次展示 `I` → `I like` → `I like to` → `I like to eat` → `I like to eat apples` → `I like to eat apples.`，每个步骤用户输入/选择正确后才进入下一步

#### Scenario: 步骤答错即时反馈
- **WHEN** 用户在某步骤给出错误词块
- **THEN** 系统 SHALL 即时标红提示并记录该次错误，允许重试；错误次数计入本题评分

### Requirement: PE-003 中译英模式

系统 SHALL 提供中译英模式：展示中文句意，用户通过连词成句拼出对应英文。

#### Scenario: 中译英完成一题
- **WHEN** 用户在零错误或允许的错误次数内拼完句子
- **THEN** 系统 SHALL 标记本题完成，记录用时与尝试次数，进入下一题

#### Scenario: 中译英跳过
- **WHEN** 用户选择跳过当前题
- **THEN** 系统 SHALL 记录为"未掌握"并放入待复习队列（与 review-system 衔接），继续下一题

### Requirement: PE-004 学习模式切换骨架

系统 SHALL 支持在以下模式间切换：中译英、听写、听力、口语测评、视频观看。本期 MUST 实现中译英，其余模式 SHALL 预留接口与模式枚举，切换后系统自动保存当前进度。

#### Scenario: 切换到尚未实现的模式
- **WHEN** 用户切换到听写/听力/口语/视频模式（本期未实现）
- **THEN** 系统 SHALL 明确提示"该模式即将上线"并保持当前中译英进度不丢失

#### Scenario: 切换模式保存进度
- **WHEN** 用户在练习中途切换模式
- **THEN** 系统 MUST 自动保存当前句子进度与课程位置

### Requirement: PE-005 按句评分

系统 SHALL 对每个练习句子给出评分，依据正确率、用时、尝试次数计算。评分规则跨端一致。

#### Scenario: 零错误快速完成
- **WHEN** 用户零错误并在目标时间内完成
- **THEN** 系统 SHALL 给出该题最高档评分

#### Scenario: 多次错误
- **WHEN** 用户多次尝试错误后完成
- **THEN** 系统 SHALL 降低该题评分，但完成即记为"已答对"

### Requirement: PE-006 多端练习体验一致性

连词成句练习的题目数据结构、评分逻辑、进度保存接口 SHALL 在 Web 与小程序端一致。输入交互（键盘/点选）与音效/动画可在两端有平台差异，但反馈时机与判定结果 MUST 一致。

#### Scenario: 小程序点选拼接
- **WHEN** 小程序用户通过点选词块拼接
- **THEN** 系统 SHALL 使用与 Web 端相同的判定逻辑判定对错

### Requirement: PE-007 平台适配层约束

涉及平台专有能力的部分（音频播放、录音、键盘、震动反馈）MUST 通过 `packages/shared/platform` 适配层调用，业务代码禁止直接调用浏览器或小程序专有 API。

#### Scenario: 调用音效反馈
- **WHEN** 答对需要播放音效
- **THEN** 业务代码 SHALL 调用适配层的统一 `playSound(name)`，由适配层分别处理 Web Audio 与小程序 InnerAudioContext
