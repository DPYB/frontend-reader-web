import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 시각적 에셋(이미지) 무단 복제 및 저장 방지 (우클릭 차단)
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e) => {
    if (e.target instanceof HTMLImageElement || e.target.closest('.protected-asset')) {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
