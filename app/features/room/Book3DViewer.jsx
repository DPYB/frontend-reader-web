import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Book3D from '../bookshelf3d/Book3D';
import { useLanguage } from '../../store/languageStore';
import './BookDetail.css';

const STORAGE_KEY = 'myReadingRoom.bookDetailViewMode';

/**
 * Book3DViewer — 도서 상세 팝업 좌측 상단에 표시되는 3D/2D 인터랙티브 도서 뷰어.
 *
 * 사용자가 원하는 대로 3D 입체 도서(360도 드래그 회전)와 2D 평면 도서 표지를
 * 자유롭게 전환(Toggle)하여 감상할 수 있습니다. 사용자의 선택은 로컬 스토리지에 기억됩니다.
 */
export default function Book3DViewer({
  title = '',
  author = '',
  coverUrl = null,
  spineColor = '#6d4c41',
  coverColor = '#3e2723',
  initialMode = null,
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(() => {
    if (initialMode) return initialMode;
    try {
      return localStorage.getItem(STORAGE_KEY) || '3D';
    } catch {
      return '3D';
    }
  });
  const [imgError, setImgError] = useState(false);

  // 표지 URL이 바뀌면 이미지 로드 에러 상태 초기화
  useEffect(() => {
    setImgError(false);
  }, [coverUrl]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // 로컬 스토리지 접근 제한 시 무시
    }
  };

  const hasValidCover = Boolean(coverUrl && !imgError);

  return (
    <div
      style={{
        width: '100%',
        height: 240,
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.35) 100%)',
        border: '1px solid var(--border)',
        boxShadow:
          'inset 0 1px 12px rgba(0, 0, 0, 0.35), 0 4px 16px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* 3D / 2D 모드 전환 세그먼트 버튼 (우측 상단) */}
      <div className="book-viewer-mode-toggle">
        <button
          type="button"
          className={`book-viewer-mode-btn ${mode === '3D' ? 'active' : ''}`}
          onClick={() => handleModeChange('3D')}
          aria-label={t('bookDetail.view3d', '3D 도서')}
          title={t('bookDetail.view3d', '3D 도서')}
        >
          <span>🎲</span> 3D
        </button>
        <button
          type="button"
          className={`book-viewer-mode-btn ${mode === '2D' ? 'active' : ''}`}
          onClick={() => handleModeChange('2D')}
          aria-label={t('bookDetail.view2d', '2D 표지')}
          title={t('bookDetail.view2d', '2D 표지')}
        >
          <span>🖼️</span> 2D
        </button>
      </div>

      {mode === '3D' ? (
        <Canvas
          camera={{ position: [1.7, 0.35, 1.25], fov: 42 }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <ambientLight intensity={1.1} />
          <directionalLight position={[3, 5, 3]} intensity={1.8} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} />
          <directionalLight position={[0, -2, 2]} intensity={0.4} />

          <group position={[0, -0.05, 0]}>
            <Book3D
              title={title}
              author={author}
              coverUrl={coverUrl}
              position={[0, 0, 0]}
              size={[0.26, 1.35, 0.95]}
              spineColor={spineColor}
              coverColor={coverColor}
              selected={false}
              showEdges={false}
              interactive={false}
            />
          </group>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.7}
          />
        </Canvas>
      ) : (
        <div className="book-viewer-2d-container">
          {hasValidCover ? (
            <img
              src={coverUrl}
              alt={title || 'Book Cover'}
              className="book-viewer-2d-img"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div
              className="book-viewer-2d-fallback"
              style={{
                background: `linear-gradient(135deg, ${coverColor} 0%, ${spineColor} 100%)`,
              }}
            >
              <div className="book-viewer-2d-fallback-spine" />
              <div className="book-viewer-2d-fallback-title">
                {title || t('bookDetail.noTitle', '제목 없음')}
              </div>
              <div className="book-viewer-2d-fallback-author">
                ✍️ {author || t('bookDetail.unknownAuthor', '저자 미입력')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 조작 안내 힌트 칩 (3D: 회전 안내 / 2D: 표지 안내) */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 999,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: 11.5,
          fontWeight: 600,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 5,
        }}
      >
        {mode === '3D' ? (
          <>
            <span>🔄</span> {t('bookDetail.rotate3dHint', '3D 도서 드래그 회전')}
          </>
        ) : (
          <>
            <span>🖼️</span> {t('bookDetail.cover2dHint', '2D 도서 표지')}
          </>
        )}
      </div>
    </div>
  );
}
