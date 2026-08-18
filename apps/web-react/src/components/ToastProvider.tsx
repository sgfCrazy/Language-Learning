import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';

interface ToastState {
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const ToastContext = createContext<(message: string, severity?: ToastState['severity']) => void>(() => undefined);

export function useToast(): (message: string, severity?: ToastState['severity']) => void {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, severity: ToastState['severity'] = 'info') => {
    setToast({ message, severity });
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast(null)} severity={toast?.severity ?? 'info'} variant="filled" sx={{ fontWeight: 600 }}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}