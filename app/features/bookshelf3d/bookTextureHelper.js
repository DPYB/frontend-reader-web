import * as THREE from 'three';
import { highResCoverUrl, DEFAULT_COVER_SRC } from '../../lib/coverImage';

/**
 * bookTextureHelper.js
 * 3D 도서의 책등(Spine) 타이틀 및 앞표지(Front Cover) 텍스처 생성 및 합성 유틸
 */

const TEXTURE_PATH = '/book_texture.webp';

let sharedTextureImg = null;
let textureLoaded = false;
const textureLoadListeners = new Set();

export function getSharedTextureImage() {
  if (typeof window === 'undefined') return null;
  if (!sharedTextureImg) {
    sharedTextureImg = new Image();
    sharedTextureImg.src = TEXTURE_PATH;
    sharedTextureImg.onload = () => {
      textureLoaded = true;
      textureLoadListeners.forEach((fn) => fn(sharedTextureImg));
      textureLoadListeners.clear();
    };
  }
  return sharedTextureImg;
}

export function onSharedTextureReady(callback) {
  if (textureLoaded && sharedTextureImg) {
    callback(sharedTextureImg);
    return () => {};
  }
  textureLoadListeners.add(callback);
  getSharedTextureImage();
  return () => {
    textureLoadListeners.delete(callback);
  };
}

/**
 * 색상의 명도(Luminance)를 계산하여 텍스트 가독성 색상(밝은/어두운) 판별
 */
function getContrastTextColor(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return '#ffffff';
  let c = hexColor.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#261b14' : '#f9f5ed';
}

/**
 * 한글 포함 여부 판별
 */
function hasKorean(text) {
  return /[\uac00-\ud7af]|[\u1100-\u11ff]|[\u3130-\u318f]/.test(text);
}

/**
 * 책등(Spine) 캔버스 텍스처 생성
 * - 너비 128px, 높이 1024px (비율 1:8)
 * - 배경: spineColor + 낮은 opacity의 질감 텍스처
 * - 상하 북바인딩 금박/은박 장식선
 * - 제목(title) 세로 배치 (한글: 위에서 아래로 세로 정렬 / 영문: 90도 회전)
 */
export function createSpineTexture(title, spineColor, sharedImg) {
  const width = 128;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. 기본 배경색
  ctx.fillStyle = spineColor || '#8a5a44';
  ctx.fillRect(0, 0, width, height);

  // 2. 종이/가죽 질감 텍스처 합성 (요청사항: opacity 낮춰서 텍스처 유지)
  const texture = sharedImg || getSharedTextureImage();
  if (texture && texture.complete && texture.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(texture, 0, 0, width, height);
    ctx.restore();
  }

  // 3. 상하 클래식 북바인딩 엠보싱 라인
  const isLight = getContrastTextColor(spineColor) === '#261b14';
  const lineGold = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 230, 160, 0.4)';
  const lineShade = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.35)';

  ctx.lineWidth = 2;
  // 상단 장식선 2줄
  [50, 58].forEach((y) => {
    ctx.strokeStyle = lineGold;
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(width - 16, y);
    ctx.stroke();
    ctx.strokeStyle = lineShade;
    ctx.beginPath();
    ctx.moveTo(16, y + 1);
    ctx.lineTo(width - 16, y + 1);
    ctx.stroke();
  });

  // 하단 장식선 2줄
  [height - 58, height - 50].forEach((y) => {
    ctx.strokeStyle = lineGold;
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(width - 16, y);
    ctx.stroke();
    ctx.strokeStyle = lineShade;
    ctx.beginPath();
    ctx.moveTo(16, y + 1);
    ctx.lineTo(width - 16, y + 1);
    ctx.stroke();
  });

  // 4. 도서 제목(title) 렌더링
  if (title && typeof title === 'string') {
    const textColor = getContrastTextColor(spineColor);
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const isKo = hasKorean(title);

    if (isKo) {
      // 한글 제목: 위에서 아래로 세로쓰기
      // 글자 수에 따라 폰트 크기 및 간격 자동 최적화
      const maxChars = 14;
      let displayTitle = title.trim();
      if (displayTitle.length > maxChars) {
        displayTitle = displayTitle.substring(0, maxChars - 1) + '…';
      }

      const charCount = displayTitle.length;
      const startY = 110;
      const endY = height - 110;
      const availableHeight = endY - startY;
      const maxFontSize = 42;
      const minFontSize = 26;
      const calculatedFontSize = Math.max(
        minFontSize,
        Math.min(maxFontSize, Math.floor(availableHeight / (charCount * 1.35)))
      );

      ctx.font = `600 ${calculatedFontSize}px 'MemomentKkukkukk', 'Pretendard', sans-serif`;

      // 글자별 렌더링 (그림자 효과로 가독성 향상)
      ctx.shadowColor = isLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      const step = Math.min(calculatedFontSize * 1.45, availableHeight / charCount);
      const totalTextHeight = (charCount - 1) * step;
      const actualStartY = startY + (availableHeight - totalTextHeight) / 2;

      for (let i = 0; i < charCount; i++) {
        const char = displayTitle[i];
        const y = actualStartY + i * step;
        ctx.fillText(char, width / 2, y);
      }
      ctx.shadowColor = 'transparent';
    } else {
      // 영문 제목: 90도 시계방향 회전하여 세로 책등을 따라 깔끔하게 한 줄 배치
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(Math.PI / 2);

      let fontSize = 34;
      ctx.font = `700 ${fontSize}px 'Outfit', 'Inter', sans-serif`;
      const maxWidth = height - 200;
      let textWidth = ctx.measureText(title).width;

      if (textWidth > maxWidth) {
        fontSize = Math.max(22, Math.floor(fontSize * (maxWidth / textWidth)));
        ctx.font = `700 ${fontSize}px 'Outfit', 'Inter', sans-serif`;
      }

      ctx.shadowColor = isLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      ctx.fillText(title, 0, 0);
      ctx.restore();
    }
  }

  const canvasTexture = new THREE.CanvasTexture(canvas);
  canvasTexture.colorSpace = THREE.SRGBColorSpace;
  canvasTexture.needsUpdate = true;
  return canvasTexture;
}

/**
 * 앞표지(Front Cover) 캔버스 텍스처 생성
 * - 너비 512px, 높이 768px (비율 1:1.5)
 * - 1단계: 기본 coverColor + 타이틀 타이포그래피 (이미지 로드 전 표시)
 * - 2단계: 표지 이미지(coverUrl) 로드 후 전체 영역 드로잉
 * - 3단계: [사용자 핵심 요구] 표지 이미지 위로 opacity를 낮춘 질감 텍스처(/book_texture.webp) 합성
 */
export function createFrontCoverTexture({
  coverUrl,
  coverColor = '#c9a06a',
  title = '',
  author = '',
  sharedImg = null,
  onUpdate = null,
}) {
  const width = 512;
  const height = 768;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const canvasTexture = new THREE.CanvasTexture(canvas);
  canvasTexture.colorSpace = THREE.SRGBColorSpace;

  const texture = sharedImg || getSharedTextureImage();

  // 기본 표지 그리기 함수 (이미지 로드 전 또는 실패 시)
  const renderFallbackCover = () => {
    ctx.clearRect(0, 0, width, height);

    // 1. 단색 배경
    ctx.fillStyle = coverColor;
    ctx.fillRect(0, 0, width, height);

    // 2. 질감 합성 (opacity 0.4)
    if (texture && texture.complete && texture.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(texture, 0, 0, width, height);
      ctx.restore();
    }

    // 3. 표지 프레임 테두리
    const textColor = getContrastTextColor(coverColor);
    ctx.strokeStyle = textColor === '#261b14' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 32, width - 64, height - 64);
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // 4. 타이포그래피 (제목 & 저자)
    if (title) {
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 제목
      let fontSize = 38;
      ctx.font = `700 ${fontSize}px 'MemomentKkukkukk', 'Pretendard', sans-serif`;
      const maxTitleWidth = width - 120;

      // 줄바꿈 처리
      const words = title.split(' ');
      const lines = [];
      let currentLine = words[0] || '';

      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        if (ctx.measureText(testLine).width > maxTitleWidth) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const titleY = height * 0.42;
      const lineHeight = fontSize * 1.35;
      const totalH = lines.length * lineHeight;
      const startY = titleY - totalH / 2;

      lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, startY + idx * lineHeight);
      });

      // 저자
      if (author) {
        ctx.font = `400 22px 'Pretendard', sans-serif`;
        ctx.fillStyle = textColor === '#261b14' ? 'rgba(38, 27, 20, 0.75)' : 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(author, width / 2, startY + totalH + 36);
      }
    }

    canvasTexture.needsUpdate = true;
    onUpdate?.();
  };

  // 먼저 초기 fallback 렌더링
  renderFallbackCover();

  // 표지 이미지가 제공된 경우 로드하여 캔버스에 합성
  const targetCoverUrl = coverUrl ? highResCoverUrl(coverUrl) : null;

  if (targetCoverUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = targetCoverUrl;

    img.onload = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. 표지 원본 이미지 그리기
      ctx.drawImage(img, 0, 0, width, height);

      // 2. [사용자 핵심 요구] 이미지 위로 opacity 낮춰서 질감 텍스처 유지
      const curTexture = texture && texture.complete && texture.naturalWidth > 0 ? texture : getSharedTextureImage();
      if (curTexture && curTexture.complete && curTexture.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = 0.28; // 은은하게 책 표지 인쇄물의 종이/패브릭 질감 살리기
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(curTexture, 0, 0, width, height);
        ctx.restore();
      }

      canvasTexture.needsUpdate = true;
      onUpdate?.();
    };

    img.onerror = () => {
      // 이미지 로드 실패 시 기본 책 표지(books.webp)로 2차 시도
      if (targetCoverUrl !== DEFAULT_COVER_SRC) {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.src = DEFAULT_COVER_SRC;
        fallbackImg.onload = () => {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(fallbackImg, 0, 0, width, height);

          // 텍스처 합성 유지
          if (texture && texture.complete && texture.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(texture, 0, 0, width, height);
            ctx.restore();
          }

          canvasTexture.needsUpdate = true;
          onUpdate?.();
        };
        fallbackImg.onerror = () => {
          renderFallbackCover();
        };
      } else {
        renderFallbackCover();
      }
    };
  }

  return canvasTexture;
}

/**
 * 책 뒷표지(Back Cover) 캔버스 텍스처 생성
 * - 너비 512px, 높이 768px (비율 1:1.5)
 * - 배경: coverColor + 낮은 opacity(0.16)의 은은한 질감 텍스처 오버레이
 * - 뒷표지 클래식 엠보싱 장식선
 */
export function createBackCoverTexture(coverColor, sharedImg) {
  const width = 512;
  const height = 768;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. 기본 배경색 (도서 표지 색상)
  ctx.fillStyle = coverColor || '#3e2723';
  ctx.fillRect(0, 0, width, height);

  // 2. 종이/가죽 질감 텍스처 합성 (뒷면 텍스처 opacity 0.16으로 은은하게 적용)
  const texture = sharedImg || getSharedTextureImage();
  if (texture && texture.complete && texture.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(texture, 0, 0, width, height);
    ctx.restore();
  }

  // 3. 뒷표지 클래식 엠보싱 테두리 라인
  const textColor = getContrastTextColor(coverColor);
  ctx.strokeStyle = textColor === '#261b14' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, width - 64, height - 64);
  ctx.lineWidth = 1;
  ctx.strokeRect(38, 38, width - 76, height - 76);

  const canvasTexture = new THREE.CanvasTexture(canvas);
  canvasTexture.colorSpace = THREE.SRGBColorSpace;
  return canvasTexture;
}

