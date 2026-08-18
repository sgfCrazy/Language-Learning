import { createTheme } from '@mui/material/styles';

export const BRAND = '#5b6cff';
export const INK = '#1a1f36';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: BRAND, contrastText: '#ffffff' },
    secondary: { main: '#f0435a' },
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    info: { main: '#0ea5e9' },
    error: { main: '#ef4444' },
    background: { default: '#f4f6fb', paper: '#ffffff' },
    text: { primary: INK, secondary: '#6b7280' },
    divider: '#eef1f7',
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"PingFang SC"',
      '"Hiragino Sans GB"',
      '"Microsoft YaHei"',
      'sans-serif',
    ].join(','),
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, padding: '10px 20px' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #eef1f7',
          boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});