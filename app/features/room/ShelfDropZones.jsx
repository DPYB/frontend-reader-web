import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * ShelfDropZones — 도서 드래그 중 목표 선반 감지 및 시각 피드백 안내 레이어
 *
 * 각 선반의 위치(pos), 크기(width, depth), 회전(euler)에 맞춰
 * 3D 투명 히트박스를 형성하고, 마우스 호버 시 해당 선반 바닥에
 * 은은한 책장 테두리/바닥 글로우(Highlight Plane)를 렌더링합니다.
 */
export default function ShelfDropZones({
  shelves = [],
  activeTargetShelfIdx = null,
  isDragging = false,
  glowColor = '#ff9a3c',
}) {
  const shelfGeometries = useMemo(() => {
    return shelves.map((shelf) => {
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(shelf.rotXdeg ?? 0),
        THREE.MathUtils.degToRad(shelf.rotYdeg ?? 0),
        THREE.MathUtils.degToRad(shelf.rotZdeg ?? 0),
        'XYZ'
      );
      const bHeight = shelf.bookHeight ?? 0.8;
      const bDepth = shelf.depth ?? 0.25;
      const bWidth = shelf.width ?? 1.5;

      return {
        id: shelf.id,
        pos: shelf.pos,
        euler,
        width: bWidth,
        height: bHeight,
        depth: bDepth,
      };
    });
  }, [shelves]);

  if (!isDragging) return null;

  return (
    <group>
      {shelfGeometries.map((g, idx) => {
        const isTarget = activeTargetShelfIdx === idx;
        if (!isTarget) return null;

        return (
          <group
            key={`dropzone-${g.id || idx}`}
            position={g.pos}
            rotation={g.euler}
          >
            {/* 마우스가 올려졌을 때 선반 바닥 및 뒤판에 나타나는 타깃 글로우 */}
            <group position={[0, 0.02, 0]}>
              {/* 선반 바닥 안착 가이드 평면 */}
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[g.width, g.depth * 1.5]} />
                <meshBasicMaterial
                  color={glowColor}
                  transparent
                  opacity={0.42}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>

              {/* 선반 후면 세로 가이드 라인 */}
              <mesh position={[0, g.height / 2, -g.depth / 2]}>
                <planeGeometry args={[g.width, g.height]} />
                <meshBasicMaterial
                  color={glowColor}
                  transparent
                  opacity={0.18}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}
