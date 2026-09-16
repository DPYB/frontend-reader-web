import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/*
 * 시각적 에셋(이미지) 무단 복제·저장 방지.
 *
 * "이미지 복사 / 이미지 다른 이름으로 저장" 같은 컨텍스트 메뉴 항목을 막기 위해
 * 이미지 위에서의 우클릭(contextmenu)과 드래그(dragstart)를 전역 차단한다.
 *   - <img>, SVG <image>: 직접 대상
 *   - CSS background-image로 깔린 요소: .protected-asset 클래스 또는 인라인/계산된
 *     background-image가 있는 요소를 감지해 함께 차단
 * (완벽한 보호는 불가능하지만 일반적인 우클릭 저장/드래그 저장 경로를 막는다)
 */
if (typeof window !== 'undefined') {
  const isImageTarget = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag === 'img' || tag === 'image' || tag === 'picture' || tag === 'canvas') return true;
    if (el.closest?.('.protected-asset, picture, svg')) return true;
    // CSS background-image가 실제로 있는 요소(예: 서재 배경, 로그인 배경)
    const bg = getComputedStyle(el).backgroundImage;
    return !!bg && bg !== 'none' && bg.includes('url(');
  };

  window.addEventListener(
    'contextmenu',
    (e) => {
      if (isImageTarget(e.target)) e.preventDefault();
    },
    { capture: true }
  );

  // 이미지를 바탕화면 등으로 끌어다 저장하는 경로 차단
  window.addEventListener(
    'dragstart',
    (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'img' || tag === 'image' || e.target?.closest?.('.protected-asset')) {
        e.preventDefault();
      }
    },
    { capture: true }
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
