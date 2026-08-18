## Why

纯文字课程不足以覆盖播客、演讲、美剧、英文歌等真实语料。需要音视频/音乐课程的播放与"一句一句停下来练"的能力，并支持跟读与跟拼，拓展学习场景与趣味性。

## What Changes

- 课程类型扩展：音频、视频、音乐课程（在 course-catalog 模型上扩展 mediaRefs）。
- 分句播放：音视频按句切片，播放到某句即停下进入练习。
- 跟读模式：跟读并录音，AI 实时打分（0-100）。
- 跟拼模式：听音频拼句子（听写模式落地）。
- 音乐课程：歌词按句推进，音乐播到哪句练哪句。
- 多端播放：Web HTML5 media；小程序 video/audio 组件；录音经适配层。

## Non-goals

- 不做视频字幕的自动生成（字幕由编辑端产出，归 `course-editor`）。
- 不做发音打分模型自研（使用第三方语音评测 API）。

## Capabilities

### New Capabilities

- `media-courses`: 音频/视频/音乐课程的播放、分句与跟读跟拼

### Modified Capabilities

- `practice-engine`: 落地听写/听力/口语测评/视频观看四种模式（前期仅留接口，本期填充）
- `course-catalog`: 句子模型扩展媒体引用与时间区间字段

## Impact

- 后端新增 `MediaModule`（媒体签名 URL 下发、切片元数据、发音评测回调）。
- 对象存储存放音视频/音频；CDN 分发。
- `packages/shared/platform` 落地媒体播放与录音适配。
- 前端播放器组件、跟读录音 UI、音乐歌词同步组件。
- 外部依赖：语音评测 API。
