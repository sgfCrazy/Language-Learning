## Purpose

落地此前预留的听写、听力、口语测评、视频观看四种练习模式，使媒体课程可用。

## MODIFIED Requirements

### Requirement: PE-004 学习模式切换骨架

系统 SHALL 支持在以下模式间切换：中译英、听写、听力、口语测评、视频观看。所有模式 MUST 实现可用。切换后系统自动保存当前进度。

#### Scenario: 切换到听写模式
- **WHEN** 用户切换到听写模式
- **THEN** 系统 SHALL 进入听写流程并保存原模式进度

#### Scenario: 切换到口语测评模式
- **WHEN** 用户切换到口语测评
- **THEN** 系统 SHALL 进入跟读录音与评分流程

#### Scenario: 切换模式保存进度
- **WHEN** 用户在练习中途切换模式
- **THEN** 系统 MUST 自动保存当前句子进度与课程位置
