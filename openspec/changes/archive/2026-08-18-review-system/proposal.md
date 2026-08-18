## Why

只学不复习会忘。需要一套比固定间隔更聪明的动态复习系统，在用户即将忘记时安排复习，并提供生词本/掌握列表让用户主动管理词汇。这是长期留存与掌握度的关键。

## What Changes

- 复习本：系统每日自动推荐需要复习的内容，用户打开即练。
- 生词本：练习中随手标记不认识的词，集中攻克。
- 掌握列表：已掌握的词移入后不再出现在练习中。
- 动态间隔复习：根据每次答题表现动态调整下次复习时间（非固定间隔）。
- 跨端一致：复习队列与生词本以服务端为准。

## Non-goals

- 不做自定义批量添加生词（归后续 `custom-vocabulary` change）。
- 不做复习算法的开放配置（参数内部维护）。

## Capabilities

### New Capabilities

- `review-system`: 复习本、生词本、掌握列表与动态间隔复习

### Modified Capabilities

- `practice-engine`: 练习答对/答错需上报至复习调度；跳过的题进入生词/待复习队列

## Impact

- 后端新增 `ReviewModule`（复习调度、生词本、掌握列表、每日推荐）。
- 数据模型新增 `ReviewItem`、`UserVocab`（status: learning/mastered/unknown）。
- 前端复习本入口、生词本管理页；练习中标记生词交互。
- 依赖定时任务/懒计算生成每日推荐。
