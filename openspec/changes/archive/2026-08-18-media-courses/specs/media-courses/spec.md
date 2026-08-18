## Purpose

支持音频、视频、音乐三类媒体课程，按句切片播放并停下来练习，提供听写、听力、口语测评与视频跟练能力，拓展真实语料学习场景。

## ADDED Requirements

### Requirement: MC-001 媒体课程分句播放

系统 SHALL 将音视频/音乐按句切片，播放到某句结束即暂停并进入该句练习。切片元数据（起止时间）由课程制作时生成。

#### Scenario: 分句播放进入练习
- **WHEN** 媒体播放到某句结束时间点
- **THEN** 系统自动暂停并进入该句练习

#### Scenario: 练习完继续播放
- **WHEN** 用户完成该句练习
- **THEN** 系统 SHALL 继续播放下一句

### Requirement: MC-002 听写模式

系统 SHALL 提供听写模式：播放音频，用户拼出句子。支持正常/慢速/重复播放。

#### Scenario: 听写完成
- **WHEN** 用户拼出与原句一致的句子
- **THEN** 系统判定正确并记录

#### Scenario: 慢速重听
- **WHEN** 用户请求慢速
- **THEN** 系统 SHALL 以慢速播放当前句音频

### Requirement: MC-003 听力模式

系统 SHALL 提供听力模式：盲听 → 慢听 → 看字幕的三阶段磨耳朵流程。

#### Scenario: 三阶段流程
- **WHEN** 用户进入听力模式
- **THEN** 系统按 盲听→慢听→看字幕 顺序提供控制，用户逐阶段推进

### Requirement: MC-004 口语测评模式

系统 SHALL 提供口语测评：用户跟读并录音，系统调用语音评测 API 给出 0-100 分。

#### Scenario: 跟读评分
- **WHEN** 用户跟读并提交录音
- **THEN** 系统返回 0-100 发音准确度评分与简短反馈

### Requirement: MC-005 音乐课程

系统 SHALL 支持音乐课程：歌词按句推进，音乐播放到某句即进入该句练习。

#### Scenario: 歌词同步练习
- **WHEN** 音乐播放到某句歌词
- **THEN** 系统进入该句练习，练习完继续播放

### Requirement: MC-006 多端媒体适配

媒体播放与录音 MUST 通过 `packages/shared/platform` 适配层：Web 用 HTML5 media + Web Audio；小程序用 video/audio 组件 + RecorderManager。业务代码禁止直调平台 API。

#### Scenario: 跨端播放同一媒体课程
- **WHEN** Web 与小程序播放同一音频课程
- **THEN** 两端分句播放与练习流程一致
