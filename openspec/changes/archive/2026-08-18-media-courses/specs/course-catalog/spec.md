## Purpose

扩展句子数据模型以承载音视频/音乐媒体的引用与分句时间区间，供媒体课程使用。

## MODIFIED Requirements

### Requirement: CC-001 内容数据模型

系统 SHALL 以三级结构组织学习内容：课程包（CoursePack）→ 课程（Course）→ 句子（Sentence）。每个句子包含英文、中文译文、词块序列、可选音/视频引用。课程包 SHALL 有标题、描述、封面、难度、标签。课程 SHALL 有类型字段（text/audio/video/music）。句子 SHALL 可选携带媒体引用（mediaUrl、媒体内起止时间 startMs/endMs）用于分句播放。

#### Scenario: 查询课程包结构
- **WHEN** 客户端请求某课程包
- **THEN** 系统返回该包及其下课程列表（含课程类型，不含全部句子，句子按课程懒加载）

#### Scenario: 句子懒加载
- **WHEN** 客户端请求某课程的练习数据
- **THEN** 系统返回该课程下全部句子的词块序列、正确顺序及（若有）媒体引用与时间区间
