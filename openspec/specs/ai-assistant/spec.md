## Purpose

在学习页面内嵌 AI 问答助手，自动感知当前练习内容，即时解答语法与用法疑问，降低跳出查词的学习摩擦。

## Requirements

### Requirement: AI-001 上下文感知提问

系统 SHALL 在用户提问时自动附带当前正在练习的句子（英文、中文、词块）作为上下文，无需用户手动粘贴。

#### Scenario: 带上下文提问
- **WHEN** 用户在练习某句时向 AI 助手提问"这个词还能怎么用"
- **THEN** 系统 SHALL 将当前句子作为上下文一并提交给 LLM 并返回针对该句的解答

### Requirement: AI-002 配额控制

系统 SHALL 每日给予每位用户 2 次免费提问；超出部分消耗钻石（与 gamification 金币体系衔接的虚拟资产）。配额按自然日重置。

#### Scenario: 免费额度内
- **WHEN** 用户当日第 1、2 次提问
- **THEN** 系统 SHALL 免费返回解答并扣减免费额度

#### Scenario: 超出免费额度
- **WHEN** 用户当日第 3 次及以后提问
- **THEN** 系统 SHALL 扣除钻石后返回解答；钻石不足时拒绝并提示

### Requirement: AI-003 内容安全与隐私

系统 SHALL 仅向 LLM 传输当前句子与用户问题，MUST NOT 传输用户身份、其他课程数据或隐私字段。返回内容 SHALL 经基础安全过滤。

#### Scenario: 拦截隐私字段
- **WHEN** 拼装 LLM 请求
- **THEN** 载荷中不含用户 id、邮箱、其他课程记录

### Requirement: AI-004 多端一致

AI 助手的提问/响应接口与配额规则 SHALL 在 Web 与小程序端一致。

#### Scenario: 跨端配额共享
- **WHEN** 用户在 Web 用完 2 次免费额度后切到小程序提问
- **THEN** 小程序 SHALL 显示额度已用尽，按超出规则计费
