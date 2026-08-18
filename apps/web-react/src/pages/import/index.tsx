import { useState } from 'react';
import { Box, Button, Card, Chip, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { useToast } from '../../components/ToastProvider';

type ImportType = 'video' | 'music' | 'audio';

const TYPE_META: Array<{ value: ImportType; label: string; icon: string; copy: string }> = [
  { value: 'video', label: '电影 / 剧集', icon: '▣', copy: '一段对白，逐句听懂' },
  { value: 'music', label: '英文歌曲', icon: '♫', copy: '跟着旋律，唱会歌词' },
  { value: 'audio', label: '播客 / 音频', icon: '◉', copy: '把长音频切成小句' },
];

const SAMPLE = "I like to eat fresh apples. | 我喜欢每天早上吃新鲜的苹果。\nEvery morning feels like a new beginning. | 每一个早晨都像新的开始。";

export default function ImportContent() {
  const navigate = useNavigate();
  const toast = useToast();
  const tokens = useAuthStore((s) => s.tokens);
  const [type, setType] = useState<ImportType>('video');
  const [title, setTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!tokens) {
      navigate('/login');
      return;
    }
    setError('');
    if (!title.trim()) return setError('先给这段内容起个名字');
    if (transcript.trim().length < 3) return setError('请粘贴英文字幕或歌词');
    setLoading(true);
    try {
      const result = await api.importMediaCourse({ title, type, mediaUrl, transcript }, tokens);
      toast(`已切成 ${result.sentenceCount} 句`, 'success');
      setTimeout(() => navigate(`/practice?courseId=${result.courseId}&type=${type}`, { replace: true }), 500);
    } catch (e) {
      setError((e as Error).message || '导入失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Box sx={{ borderRadius: 3, p: { xs: 3, md: 4 }, mb: 3, color: '#fff', background: 'linear-gradient(135deg, #f26b4d 0%, #5b6cff 100%)' }}>
        <Chip size="small" label="CONTENT LAB" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 800 }}>把你喜欢的英文，变成练习。</Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.92 }}>导入电影、歌曲或播客，句乐部会把它拆成一小句一小句，陪你听、拼、跟读。</Typography>
        <Typography variant="body2" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', fontWeight: 600 }}>
          导入素材 → 自动切句 → 开始跟练
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2 }}>
        <Card variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 800 }}>新建内容</Typography>
            <Typography variant="body2" color="text.secondary">最多 200 句</Typography>
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>内容类型</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2.5 }}>
            {TYPE_META.map((item) => (
              <Box
                key={item.value}
                onClick={() => setType(item.value)}
                sx={{
                  border: 1.5,
                  borderColor: type === item.value ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 1.5,
                  cursor: 'pointer',
                  bgcolor: type === item.value ? 'primary.50' : 'transparent',
                  textAlign: 'center',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Typography sx={{ fontSize: 22 }}>{item.icon}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>{item.label}</Typography>
                <Typography variant="caption" color="text.secondary">{item.copy}</Typography>
              </Box>
            ))}
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>内容名称</Typography>
          <TextField fullWidth size="small" placeholder="例如：Friends S01E01 / Yellow" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2.5 }} />

          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>媒体链接（可选）</Typography>
          <TextField fullWidth size="small" placeholder="粘贴可播放的音频或视频链接" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} sx={{ mb: 2.5 }} />

          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>字幕 / 歌词</Typography>
            <Typography variant="caption" color="text.secondary">一行一句，可用 | 分隔中文释义</Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={6}
            name="transcript"
            placeholder="每行粘贴一句英文字幕或歌词…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            inputProps={{ maxLength: 30000 }}
          />
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              没有素材？&nbsp;
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer' }} onClick={() => setTranscript(SAMPLE)}>填入示例</Box>
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Button variant="contained" color="primary" fullWidth size="large" disabled={loading} onClick={() => void submit()}>
            {loading ? <CircularProgress size={20} color="inherit" /> : tokens ? '生成逐句练习' : '登录后开始导入'}
          </Button>
        </Card>

        <Card variant="outlined" sx={{ p: 3, height: 'fit-content' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>学习时会看到</Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">第 1 / 12 句</Typography>
              <Typography variant="caption" color="text.secondary">0</Typography>
            </Box>
            <Box sx={{ width: '100%', height: 6, bgcolor: 'divider', borderRadius: 999, overflow: 'hidden', mb: 2 }}>
              <Box sx={{ width: '8%', height: '100%', bgcolor: 'primary.main', borderRadius: 999 }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>按顺序拼出这句话</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
              {['I', 'like', 'to', 'eat', 'fresh apples'].map((w) => (
                <Chip key={w} size="small" variant="outlined" label={w} />
              ))}
            </Box>
            <Typography variant="body2" sx={{ mb: 2 }}>我喜欢吃新鲜的苹果。</Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {['▶ 原音', '🐢 慢速', '🎙 跟读'].map((t) => (
                <Typography key={t} variant="caption" color="text.secondary">{t}</Typography>
              ))}
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, lineHeight: 1.6 }}>
            导入后，媒体会按当前字幕作为每句学习内容。自动语音识别和时间轴对齐可以在下一步接入。
          </Typography>
        </Card>
      </Box>
    </div>
  );
}