import { Box, Card, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

interface GrowthItem {
  date: string;
  value: number;
}
interface HeatItem {
  date: string;
  count: number;
}

export default function Growth() {
  const tokens = useAuthStore((s) => s.tokens);
  const { data: growth } = useQuery({
    queryKey: ['growth'],
    queryFn: () => api.growth(tokens),
    enabled: !!tokens,
  });
  const { data: heatmap } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => api.heatmap(tokens),
    enabled: !!tokens,
  });

  if (!tokens) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>🔒 请先登录</Typography></Box></div>
    );
  }

  const items = (growth?.items as GrowthItem[]) ?? [];
  const heats = (heatmap?.items as HeatItem[]) ?? [];
  const maxVal = Math.max(1, ...items.map((i) => i.value));
  const maxHeat = Math.max(1, ...heats.map((i) => i.count));

  return (
    <div className="page-shell">
      <Typography className="page-title">成长记录</Typography>
      <Typography className="page-sub">坚持看得见，进步摸得着</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{items.length}</Typography>
          <Typography variant="body2" color="text.secondary">学习天数</Typography>
        </Card>
        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{items.reduce((s, i) => s + i.value, 0)}</Typography>
          <Typography variant="body2" color="text.secondary">累计积分</Typography>
        </Card>
        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{heats.length}</Typography>
          <Typography variant="body2" color="text.secondary">活跃天数</Typography>
        </Card>
      </Box>

      <Card variant="outlined" sx={{ p: 3, mb: 2.5 }}>
        <Typography sx={{ fontWeight: 800, mb: 2 }}>成长曲线</Typography>
        {items.length === 0 ? (
          <Box className="center-slot" sx={{ py: 4 }}><Typography>📈 还没有学习数据</Typography></Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 220, pt: 2 }}>
            {items.slice(-14).map((it, i) => (
              <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{it.value}</Typography>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 24,
                    borderRadius: 1,
                    height: `${Math.max(8, (it.value / maxVal) * 150)}px`,
                    background: 'linear-gradient(180deg, #5b6cff, #8b5cf6)',
                    opacity: 0.65 + (i / items.length) * 0.35,
                  }}
                />
                <Typography variant="caption" color="text.disabled">{it.date.slice(5)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Card variant="outlined" sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ fontWeight: 800 }}>学习热力图</Typography>
          <Typography variant="body2" color="text.secondary">{heats.length} 天</Typography>
        </Box>
        {heats.length === 0 ? (
          <Box className="center-slot" sx={{ py: 4 }}><Typography>🔥 暂无学习记录</Typography></Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {heats.slice(-42).map((h, i) => (
              <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    bgcolor: h.count >= maxHeat * 0.7 ? '#5b6cff' : h.count >= maxHeat * 0.4 ? '#c4ccff' : '#f1f4f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: h.count >= maxHeat * 0.4 ? '#fff' : 'text.disabled' }}>{h.count}</Typography>
                </Box>
                <Typography variant="caption" color="text.disabled">{h.date.slice(5)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Card>
    </div>
  );
}