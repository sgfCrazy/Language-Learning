## Context

practice-engine 预留了听写/听力/口语测评/视频观看四种模式，但当前练习页硬编码为中译英。
Sentence 模型已含 mediaUrl/startMs/endMs；Course.type 已含 audio/video/music。本期把媒体课程做实：
按句切片播放→暂停进入练习，听写/听力/口语测评三种模式落地，音乐课程歌词推进。
生产应靠对象存储/CDN + 第三方语音评测 API；开发期无外部依赖，用自产 WAV + 确定性评分桩。

## Goals / Non-Goals

**Goals:**
- MC-001/005：媒体课程按句播放，播到某句结束即暂停进入该句练习；音乐歌词按句推进。
- MC-002：听写模式（播放音频→拼句→判定）。
- MC-003：听力模式（盲听→慢听→看字幕三阶段）。
- MC-004：口语测评（跟读录音→0-100 评测）。
- MC-006 / PE-004：模式切换 UI + 统一走 `packages/shared/platform` 媒体适配层；四种模式均可用。

**Non-Goals:**
- 不做字幕自动生成（归 course-editor）。
- 不自研发音评分模型（生产接第三方评测 API，本期留接口 + 确定性桩）。
- 不做真实对象存储/CDN（开发期 URL 直出轻量 WAV）。

## Decisions

### D1: 开发期媒体 URL 由后端生成轻量 WAV
新增 `GET /media/audio/:sentenceId`：服务端按句子文本实时合成一段正弦"语音占位"WAV
（N 句不同音高，便于听辨），Content-Type `audio/wav`。seed 给每个媒体句写
`mediaUrl=/api/v1/media/audio/<id>`、`startMs=i*2000`、`endMs=i*2000+2000`。
生产替换为对象存储/CDN URL，字段结构不变（CC-001 已支持）。

### D2: 媒体播放抽象进 PlatformAdapter
`packages/shared/src/platform/index.ts` 新增 `MediaPlayer` 接口：
`play(url)/pause()/stop()/seek(ms)/setRate()/onTimeUpdate/onEnded/getDuration`。
Web 用 HTML5 `Audio`；小程序用 `Taro.createInnerAudioContext`。业务代码不直调平台 API（MC-006）。

### D3: 口语评测走服务端点，生产接第三方 API
`POST /media/speech-score` 接收 `{ sentenceText, durationMs }`。
`SpeechEvalService`：配置了 `SPEECH_API_KEY` 时调第三方 API；否则用 shared 纯函数 `evaluateSpeaking`
确定性给分（文本哈希定分数 60-100 + 时长过短扣分），返回 0-100 与简短反馈。录音流本期由适配层上报时长，
不传真实音频（Non-goal）。

### D4: 三阶段听力状态机放前端
听力模式：`blind`→`slow`→`subtitle` 三阶段。blind 只播音频；slow 用 `setRate(0.75)` 慢速重播；
subtitle 展示英文+中文。纯前端状态，后端只存进度/记录。

### D5: 模式切换入口在练习页顶部
练习页加模式切换条（中译英/听写/听力/口语测评）。切换保存当前进度（复用现有 saveProgress）。
听写/听力默认给 audio/music 课程；speaking 可对任意句；video_watch 用于 video 课程的 `<Video>` 组件。

### D6: seed 增加媒体课程
`日常英语入门` 增加 1 门 audio 课程（问候语跟读）；`PTE` 包增加 1 门 music 课程（歌词按句）。
其余课程保持 type=text。

## Risks / Trade-offs

- [合成 WAV 非真实语音] → 仅开发期可听辨节奏/音高，发音内容需生产真实音频；接口与切片逻辑通用。
- [录音只上报时长不传音频] → 评分桩确定性、无法真实评测发音；生产接第三方 API 后补上传。
- [music 课程歌词 = 现有句子] → 用句子即歌词行，MC-005 的"练习完继续播放"由句推进代替自动续播。

## Migration Plan

- 无需加表（复用 Sentence.mediaUrl/startMs/endMs 与 Course.type）。
- `pnpm -F @app/server seed` 重建含媒体课程的种子数据。
- 新增共享 `MediaPlayer` 接口与 web/miniapp 适配实现。