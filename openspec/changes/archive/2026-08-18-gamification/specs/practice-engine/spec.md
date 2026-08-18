## Purpose

定义练习结算阶段对外暴露连击与评级结果的接口，使 gamification 能力可消费练习结果。

## MODIFIED Requirements

### Requirement: PE-005 按句评分

系统 SHALL 对每个练习句子给出评分，依据正确率、用时、尝试次数计算。评分规则跨端一致。练习结束时系统 SHALL 同时输出本次练习的连击峰值与评级结果（评级规则由 gamification 能力定义，本能力仅负责产出原始指标）。

#### Scenario: 零错误快速完成
- **WHEN** 用户零错误并在目标时间内完成
- **THEN** 系统 SHALL 给出该题最高档评分

#### Scenario: 多次错误
- **WHEN** 用户多次尝试错误后完成
- **THEN** 系统 SHALL 降低该题评分，但完成即记为"已答对"

#### Scenario: 结算输出连击与评级指标
- **WHEN** 一次练习结束
- **THEN** 系统 SHALL 输出每题得分率、连击峰值、总用时等原始指标供评级计算
