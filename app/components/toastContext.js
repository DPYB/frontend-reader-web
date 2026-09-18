import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// 모듈 레벨에서 어디서든 showToast를 호출할 수 있도록 리스너 지원 (authApi 403 등)
let toastListener = null;

export function setToastListener(listener) {
  toastListener = listener;
}

export function showGlobalToast(message, type = 'info', duration = 3500) {
  if (typeof toastListener === 'function') {
    toastListener({ message, type, duration });
  }
}
