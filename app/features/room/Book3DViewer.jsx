import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Book3D from '../bookshelf3d/Book3D';
import { useLanguage } from '../../store/languageStore';

/**
 * Book3DViewer — 도서 상세 팝업 좌측 상단에 표시되는 인터랙티브 3D 책 뷰어.
 *
 * 사용자가 2D 평면 이미지 대신 도서 표지와 책등 텍스처가 적용된 실제 3D 도서를
 * 360도 자유롭게 돌려보며 입체감을 감상할 수 있습니다.
 */
export default function Book3DViewer({
  title = '',
  author = '',
  coverUrl = null,
  spineColor = '#6d4c41',
  coverColor = '#3e2723',
}) {
  const { t } = useLanguage();

  return (
    <div
      style={{
        width: '100%',
        height: 240,
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.35) 100%)',
        border: '1px solid var(--border)',
        boxShadow: 'inset 0 1px 12px rgba(0, 0, 0, 0.35), 0 4px 16px rgba(0, 0, 0, 0.2)',
      }}
    >
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

      {/* 3D 회전 조작 안내 힌트 칩 */}
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
        }}
      >
        <span>🔄</span> {t('bookDetail.rotate3dHint', '3D 도서 드래그 회전')}
      </div>
    </div>
  );
}
