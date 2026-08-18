## 1. 共享层：媒体适配 + 评测纯函数

^- [x] 1.1 `shared/src/platform/index.ts` 加 `MediaPlayer` 接口 + PlatformAdapter 挂 `media` — shared — 验收：typecheck 通过
^- [x] 1.2 `shared/src/speaking.ts`：`evaluateSpeaking(text, durationMs)` 确定性 0-100 评分 + 反馈 — shared — 验收：单测覆盖
^- [x] 1.3 shared 单测 `test/speaking.test.ts` — shared — 验收：vitest 全过
^- [x] 1.4 `apps/web-taro/src/platform/adapter.web.ts` / `adapter.miniapp.ts` 实现 `media` — web/miniapp — 验收：typecheck 通过

## 2. 后端 MediaModule

^- [x] 2.1 `MediaService.generateWav(sentenceText)`：按句子合成长度 ~8s 正弦 WAV Buffer — server — 验收：可解析 wav header
^- [x] 2.2 `MediaController`：`GET /media/audio/:sentenceId` 返回 WAV（Content-Type audio/wav）— server — 验收：supertest 返回 200 + audio/wav
^- [x] 2.3 `POST /media/speech-score`：调 `evaluateSpeaking`（SPEECH_API_KEY 存在时走第三方，本期桩）— server — 验收：supertest 返回 0-100 score
^- [x] 2.4 `MediaModule` 注册进 app.module — server — 验收：typecheck 通过
^- [x] 2.5 seed 增加 audio 课程（纪录 4 句带 mediaUrl/startMs/endMs）+ music 课程（歌词 4 句）— server — 验收：seed 后媒体字段非空

## 3. 前端：模式切换 + 三种模式

^- [x] 3.1 练习页顶部模式切换条（中译英/听写/听力/口语测评），切换保存进度 — web/miniapp — 验收：button 切换后模式状态变化
^- [x] 3.2 听写模式：media.play 按句播放 → 拼句判定 → 慢速重播按钮 — web/miniapp — 验收：typecheck 通过、音频播放走 adapter.media
^- [x] 3.3 听力模式：盲听→慢听→字幕三阶段控件 — web/miniapp — 验收：三阶段按钮可见可切
^- [x] 3.4 口语测评：录音 → 调 speech-score → 展示 0-100 分与反馈 — web/miniapp — 验收：评分渲染
^- [x] 3.5 music/video 课程句在大纲页展示歌词/媒体标识 — web/miniapp — 验收：类型图标渲染

## 4. 测试与归档

^- [x] 4.1 `openspec validate media-courses --strict` 通过 — shared — 验收：校验无错误
^- [x] 4.2 全仓 typecheck + test 全绿 — shared — 验收：无错误