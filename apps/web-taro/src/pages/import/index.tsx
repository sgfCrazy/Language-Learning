import { useState } from 'react';
import { View, Text, Input, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

type ImportType = 'video' | 'music' | 'audio';

const TYPE_META: Array<{ value: ImportType; label: string; icon: string; copy: string }> = [
  { value: 'video', label: '电影 / 剧集', icon: '▣', copy: '一段对白，逐句听懂' },
  { value: 'music', label: '英文歌曲', icon: '♫', copy: '跟着旋律，唱会歌词' },
  { value: 'audio', label: '播客 / 音频', icon: '◉', copy: '把长音频切成小句' },
];

const SAMPLE = "I like to eat fresh apples. | 我喜欢每天早上吃新鲜的苹果。\nEvery morning feels like a new beginning. | 每一个早晨都像新的开始。";

export default function ImportContent() {
  const tokens = useAuthStore((s) => s.tokens);
  const [type, setType] = useState<ImportType>('video');
  const [title, setTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!tokens) {
      Taro.navigateTo({ url: '/pages/login/index' });
      return;
    }
    setError('');
    if (!title.trim()) return setError('先给这段内容起个名字');
    if (transcript.trim().length < 3) return setError('请粘贴英文字幕或歌词');
    setLoading(true);
    try {
      const result = await api.importMediaCourse({ title, type, mediaUrl, transcript }, tokens);
      Taro.showToast({ title: `已切成 ${result.sentenceCount} 句`, icon: 'success' });
      setTimeout(() => Taro.redirectTo({ url: `/pages/practice/index?courseId=${result.courseId}&type=${type}` }), 500);
    } catch (e) {
      setError((e as Error).message || '导入失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="page-shell import-page">
      <View className="import-hero">
        <View className="import-kicker"><Text className="import-kicker-dot" /> CONTENT LAB</View>
        <Text className="import-title">把你喜欢的英文，变成练习。</Text>
        <Text className="import-copy">导入电影、歌曲或播客，句乐部会把它拆成一小句一小句，陪你听、拼、跟读。</Text>
        <View className="import-flow">
          <Text>导入素材</Text><Text className="import-arrow">→</Text><Text>自动切句</Text><Text className="import-arrow">→</Text><Text>开始跟练</Text>
        </View>
      </View>

      <View className="import-layout">
        <View className="card import-form">
          <View className="section-title"><Text>新建内容</Text><Text className="more">最多 200 句</Text></View>
          <Text className="form-label">内容类型</Text>
          <View className="import-types">
            {TYPE_META.map((item) => (
              <View key={item.value} className={`import-type ${type === item.value ? 'active' : ''}`} onClick={() => setType(item.value)}>
                <Text className="import-type-icon">{item.icon}</Text>
                <Text className="import-type-label">{item.label}</Text>
                <Text className="import-type-copy">{item.copy}</Text>
              </View>
            ))}
          </View>

          <Text className="form-label">内容名称</Text>
          <View className="input-wrap"><Input placeholder="例如：Friends S01E01 / Yellow" value={title} onInput={(e) => setTitle(e.detail.value)} /></View>

          <Text className="form-label">媒体链接（可选）</Text>
          <View className="input-wrap"><Input placeholder="粘贴可播放的音频或视频链接" value={mediaUrl} onInput={(e) => setMediaUrl(e.detail.value)} /></View>

          <View className="label-row"><Text className="form-label">字幕 / 歌词</Text><Text className="form-hint">一行一句，可用 | 分隔中文释义</Text></View>
          <View className="textarea-wrap"><Textarea maxlength={30000} placeholder="每行粘贴一句英文字幕或歌词…" value={transcript} onInput={(e) => setTranscript(e.detail.value)} /></View>
          <View className="sample-row"><Text>没有素材？</Text><Text className="sample-link" onClick={() => setTranscript(SAMPLE)}>填入示例</Text></View>

          {error && <Text className="import-error">{error}</Text>}
          <View className="btn btn-primary btn-block import-submit" onClick={() => void submit()}>{loading ? '正在切句…' : tokens ? '生成逐句练习' : '登录后开始导入'}</View>
        </View>

        <View className="import-preview">
          <Text className="preview-label">学习时会看到</Text>
          <View className="study-mini-card">
            <View className="study-mini-top"><Text>第 1 / 12 句</Text><Text className="study-mini-score">0</Text></View>
            <View className="study-progress"><View /></View>
            <Text className="study-mini-hint">按顺序拼出这句话</Text>
            <View className="study-mini-words"><Text>I</Text><Text>like</Text><Text>to</Text><Text>eat</Text><Text>fresh apples</Text></View>
            <Text className="study-mini-translation">我喜欢吃新鲜的苹果。</Text>
            <View className="study-mini-tools"><Text>▶ 原音</Text><Text>🐢 慢速</Text><Text>🎙 跟读</Text></View>
          </View>
          <Text className="preview-note">导入后，媒体会按当前字幕作为每句学习内容。自动语音识别和时间轴对齐可以在下一步接入。</Text>
        </View>
      </View>
    </View>
  );
}
