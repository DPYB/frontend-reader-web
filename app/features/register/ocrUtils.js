import { createWorker } from 'tesseract.js';

/*
 * 사서별 서재 테마 컬러에 맞춘 책 색상 팔레트 (사용자 요청, 2026-09).
 * 각 사서의 index.css --accent 색상(다크 모드 기준)을 중심으로 명도가 다른
 * 6가지 변형을 만들어, 어느 서재에 등록하든 배경/글로우 색과 어울리는 책이
 * 꽂히도록 한다. 게코는 아직 전용 테마 색이 없어(전용 배경/글로우 미적용,
 * shelfLayout.js·LibraryScene.jsx 참고) 고양이 팔레트로 대체한다.
 *
 *   cat(블루):   오렌지 계열 (--accent #ff9a3c)
 *   stork(슈빌): 보라 계열 (--accent #9b7bf0)
 *   nudi(누디):  청록 계열 (--accent #4fc4ac)
 *   gecko(게코): 전용 색 없음 → cat과 동일 팔레트로 대체
 */
export const COLOR_PRESETS_BY_LIBRARIAN = {
  cat: [
    { spine: '#c96b32', cover: '#e8944a' }, // 앰버
    { spine: '#8b4513', cover: '#b5651d' }, // 새들브라운
    { spine: '#a0522d', cover: '#cd853f' }, // 시에나
    { spine: '#d4763e', cover: '#f2a365' }, // 피치
    { spine: '#6b3a2a', cover: '#8c5a3c' }, // 다크 코코아
    { spine: '#bf7830', cover: '#e0a050' }, // 골든
  ],
  stork: [
    { spine: '#6a4fb0', cover: '#9b7bf0' }, // 보라
    { spine: '#4a3480', cover: '#7d5bc8' }, // 다크 인디고
    { spine: '#5c4a9a', cover: '#8a72d4' }, // 라벤더
    { spine: '#7d5bc8', cover: '#b39ded' }, // 라일락
    { spine: '#3d2e66', cover: '#5c4a9a' }, // 딥 퍼플
    { spine: '#584099', cover: '#8f76d6' }, // 아메시스트
  ],
  nudi: [
    { spine: '#2d8f78', cover: '#4fc4ac' }, // 청록
    { spine: '#1f6b5a', cover: '#3a9c85' }, // 다크 틸
    { spine: '#237f6b', cover: '#45b39a' }, // 에메랄드
    { spine: '#3aa38c', cover: '#63d1b8' }, // 민트
    { spine: '#175247', cover: '#2d8f78' }, // 딥 틸
    { spine: '#2a9683', cover: '#57c2ab' }, // 시게
  ],
};
COLOR_PRESETS_BY_LIBRARIAN.gecko = COLOR_PRESETS_BY_LIBRARIAN.cat;

/** 사서 id에 맞는 책 색상 팔레트를 반환 (없으면 cat 팔레트로 대체) */
export function getColorPresets(librarianId) {
  return COLOR_PRESETS_BY_LIBRARIAN[librarianId] || COLOR_PRESETS_BY_LIBRARIAN.cat;
}

// 하위 호환: 기존에 colorPresets를 직접 import하던 코드는 고양이(기본) 팔레트를 그대로 받는다.
export const colorPresets = COLOR_PRESETS_BY_LIBRARIAN.cat;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 이미지의 평균 색상을 계산해 가장 가까운 색상 프리셋 인덱스를 반환.
 * @param {HTMLImageElement} img
 * @param {Array<{spine:string,cover:string}>} [presets=colorPresets] - 대상 팔레트
 *   (사서별 팔레트를 넘기면 그 안에서 가장 가까운 색을 고른다)
 * @returns {number} presets 인덱스
 */
export function extractDominantColorIndex(img, presets = colorPresets) {
  const canvas = document.createElement('canvas');
  const size = 32; // 다운샘플링해서 평균 계산 비용 절감
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);

  let r = 0, g = 0, b = 0, count = 0;
  const { data } = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  r /= count;
  g /= count;
  b /= count;

  let bestIdx = 0;
  let bestDist = Infinity;
  presets.forEach((p, idx) => {
    const [pr, pg, pb] = hexToRgb(p.cover);
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

/**
 * 이미지 파일에서 순수 텍스트를 인식 (문장 수집용).
 * 제목/저자 구조화 없이 원문 텍스트만 반환한다.
 * @param {File} file
 * @returns {Promise<string>} 인식된 텍스트
 */
export async function recognizeText(file) {
  const worker = await createWorker('kor+eng');
  try {
    const { data } = await worker.recognize(file);
    return (data.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * File을 미리보기/색상추출용 <img>로 로드.
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
