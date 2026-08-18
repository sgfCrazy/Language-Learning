## Context

练习引擎与进度追踪已落地，用户答题数据已写入 `PracticeRecord`。现在需要基于这些数据构建动态间隔复习系统。
`UserVocab` 表已在 schema 中预留（status/dueAt/interval/ease/reps），本期填充逻辑。

## Goals / Non-alls

**Goals:**
- 动态间隔复习调度：基于 SM-2 算法变体，根据答题表现调整下次复习时间。
- 每日复习本：自动生成当日到期项列表。
- 生词本：练习中标记生词，集中攻克。
- 掌握列表：已掌握的词移入后不再出现在练习中。

**Non-Goals:**
- 不做批量添加生词（后续 custom-vocabulary change）。
- 不做复习算法参数的用户可配置化。

## Decisions

### D1: SM-2 算法变体
- 答对：ease *= 1.1（上限 3.0），interval = round(interval * ease)，reps++
- 答错：ease = max(1.3, ease * 0.8)，interval = 1，reps = 0
- dueAt = now + interval 天
- 掌握判定：reps >= 5 且 interval >= 21 天 → status = mastered

### D2: 复习粒度
复习以"句子"为单位（不是单词），因为练习引擎是句子级。UserVocab 存词级别的生词本，
复习本则从 PracticeRecord 中找出"未掌握"(correct=false) 的句子。两者并存。

### D3: 生词本与句子复习的关系
- 生词本 = UserVocab 表（词级别，用户手动标记）
- 复习本 = 从 PracticeRecord 找答错的句子 + UserVocab 到期项
- 掌握列表 = UserVocab.status = mastered

## Risks

- [SM-2 参数可能不适合语言学习] → 后期可调，算法参数集中在 shared 纯函数。
