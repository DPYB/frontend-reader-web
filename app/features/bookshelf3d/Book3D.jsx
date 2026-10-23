import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import {
  createSpineTexture,
  createFrontCoverTexture,
  createBackCoverTexture,
  getSharedTextureImage,
  onSharedTextureReady,
} from './bookTextureHelper';

/**
 * Book3D — boxGeometry 기반 단일 3D 책
 *
 * 좌표계: 책등(spine)이 +Z(정면)을 향하도록 배치.
 *  - +Z 면: 책등(spine)  → 선반에서 보이는 면 (책 제목 렌더링)
 *  - +X 면: 앞표지 (도서 표지 이미지 + 은은한 종이 질감 텍스처)
 *  - -X 면: 뒤표지 (기본 표지 색상 + 질감)
 *  - +Y / -Y / -Z 면: 책배(페이지 단면)
 *
 * BoxGeometry material 인덱스 순서: [+X, -X, +Y, -Y, +Z, -Z]
 *
 * 상호작용:
 *  - hover: 아주 살짝만 앞으로(+Z) 당겨지고(0.05), 테두리에 accent色 glow가 페이드인.
 *  - selected: 책이 앞으로 빠져나와 위로 올라오고, Y축 -90° 회전하여 앞표지(+X)를 카메라로 향함
 */
// 3D 책 표면 질감 텍스처 (포토샵 Multiply 블렌드처럼 기본 색상과 합성)
const TEXTURE_PATH = '/book_texture.webp';

let sharedBookTexture = null;
function getBookTexture() {
  if (!sharedBookTexture && typeof window !== 'undefined') {
    const loader = new THREE.TextureLoader();
    sharedBookTexture = loader.load(TEXTURE_PATH);
    sharedBookTexture.colorSpace = THREE.SRGBColorSpace;
    sharedBookTexture.wrapS = THREE.RepeatWrapping;
    sharedBookTexture.wrapT = THREE.RepeatWrapping;
  }
  return sharedBookTexture;
}

export default function Book3D({
  title = '',
  author = '',
  showSpineTitle = true,
  coverUrl = null,
  position = [0, 0, 0],
  size = [0.22, 1.2, 0.85],
  spineColor = '#8a5a44',
  coverColor = '#c9a06a',
  spineMap = null,
  coverMap = null,
  pageColor = '#f2ead6',
  selected = false,
  rotationY = 0,
  rotation = null,
  pullDir = 1,
  selectedDepthScale = 2.6,
  selectedScale = 2.6,
  glowColor = '#ff9a3c',
  showEdges = true,
  interactive = true,
  onSelect,
  onHover,
  isDragging = false,
  dragPosition = null,
  onDragInitiate = null,
}) {
  const { invalidate } = useThree();
  const [textureVer, setTextureVer] = useState(0);

  // 기본 자세: rotation([x,y,z]) 우선, 없으면 rotationY만
  const [rx, ry, rz] = rotation || [0, rotationY, 0];
  const groupRef = useRef(null);
  // 테두리 glow(핵심선 + 은은한 halo) 머티리얼 참조 — useFrame에서 opacity를 댐핑
  const edgeCoreRef = useRef(null);
  const edgeHaloRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  // 싱글톤 책 표면 질감 텍스처 (bumpMap용)
  const texture = useMemo(() => getBookTexture(), []);

  // 공용 질감 이미지가 브라우저에 로드 완료되면 캔버스 텍스처 재합성 트리거
  useEffect(() => {
    return onSharedTextureReady(() => {
      setTextureVer((v) => v + 1);
      invalidate();
    });
  }, [invalidate]);

  const bookThickness = size?.[0] ?? 0.22;
  const bookHeight = size?.[1] ?? 1.2;
  const spineTitle = showSpineTitle ? title : '';

  // 책등(Spine) 캔버스 텍스처: 도서 이름 표시(showSpineTitle이 true일 때만) + 책등 장식선 + 질감 텍스처
  const dynamicSpineMap = useMemo(() => {
    if (spineMap) return spineMap;
    void textureVer;
    return createSpineTexture(spineTitle, spineColor, getSharedTextureImage(), {
      thickness: bookThickness,
      height: bookHeight,
    });
  }, [spineMap, spineTitle, spineColor, textureVer, bookThickness, bookHeight]);

  // 앞표지(Front Cover) 캔버스 텍스처: 책 표지 이미지 + 투명도 낮춘 질감 텍스처 오버레이
  const dynamicCoverMap = useMemo(() => {
    if (coverMap) return coverMap;
    void textureVer;
    return createFrontCoverTexture({
      coverUrl,
      coverColor,
      title,
      author,
      sharedImg: getSharedTextureImage(),
      onUpdate: () => {
        invalidate();
      },
    });
  }, [coverMap, coverUrl, coverColor, title, author, textureVer, invalidate]);

  // 뒤표지(Back Cover) 캔버스 텍스처: 기본 표지 색상 + 은은하게 투명도를 대폭 낮춘(16%) 질감 텍스처 오버레이
  const dynamicBackCoverMap = useMemo(() => {
    void textureVer;
    return createBackCoverTexture(coverColor, getSharedTextureImage());
  }, [coverColor, textureVer]);

  // 텍스처 언마운트 시 메모리 해제
  useEffect(() => {
    return () => {
      if (dynamicSpineMap && !spineMap) dynamicSpineMap.dispose();
      if (dynamicCoverMap && !coverMap) dynamicCoverMap.dispose();
      if (dynamicBackCoverMap) dynamicBackCoverMap.dispose();
    };
  }, [dynamicSpineMap, dynamicCoverMap, dynamicBackCoverMap, spineMap, coverMap]);

  const materials = useMemo(() => {
    const activeSpineMap = dynamicSpineMap || texture;
    const activeCoverMap = dynamicCoverMap || texture;
    const activeBackCoverMap = dynamicBackCoverMap || texture;

    // 책등(+Z): dynamicSpineMap(도서 이름 + 책등 색상 + 은은한 질감)
    const spine = new THREE.MeshStandardMaterial({
      color: spineMap ? spineColor : '#ffffff',
      map: activeSpineMap,
      roughness: 0.65,
      metalness: 0.05,
      bumpMap: texture || null,
      bumpScale: 0.01,
    });

    // 앞표지(+X): dynamicCoverMap(도서 표지 이미지 + opacity 낮춘 질감 오버레이)
    const frontCover = new THREE.MeshStandardMaterial({
      color: coverMap ? coverColor : '#ffffff',
      map: activeCoverMap,
      roughness: 0.55,
      metalness: 0.05,
      bumpMap: texture || null,
      bumpScale: 0.012,
    });

    // 뒤표지(-X): dynamicBackCoverMap(부드러운 16% opacity 질감 + 클래식 테두리)
    const backCover = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: activeBackCoverMap,
      roughness: 0.65,
      metalness: 0.05,
      bumpMap: texture || null,
      bumpScale: 0.005,
    });

    // 책배(페이지 단면) 머티리얼
    const pages = new THREE.MeshStandardMaterial({
      color: pageColor,
      roughness: 0.9,
      metalness: 0,
    });

    // [+X, -X, +Y, -Y, +Z, -Z]
    // +X: 앞표지, -X: 뒤표지, +Y/-Y: 페이지 위/아래, +Z: 책등, -Z: 페이지 뒤
    return [frontCover, backCover, pages, pages, spine, pages];
  }, [spineColor, coverColor, dynamicSpineMap, dynamicCoverMap, dynamicBackCoverMap, spineMap, coverMap, pageColor, texture]);

  // 책등(+Z 로컬)이 회전 적용 후 향하는 월드 방향 = 빠져나오는 방향
  const forward = useMemo(() => {
    const v = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(rx, ry, rz));
    return [v.x, v.y, v.z];
  }, [rx, ry, rz]);

  // 상태별 목표 변환값
  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    let targetX;
    let targetY;
    let targetZ;
    let targetScaleXY = 1;
    let targetScaleZ = 1;
    let extraRotY = 0;
    let lambda = 8;

    if (isDragging && dragPosition) {
      // 드래그 중: 3D 좌표가 직접 주어졌을 때
      targetX = dragPosition[0];
      targetY = dragPosition[1];
      targetZ = dragPosition[2] + 0.45;
      targetScaleXY = 1.08;
      targetScaleZ = 1.08;
      lambda = 24;
    } else if (isDragging) {
      // 드래그 중: 목표 선반 스냅 위치에서 살짝 앞으로 떠오르고 커져서 이동 피드백 제공
      const lift = 0.22;
      const forwardPull = 0.35;
      targetX = position[0] + forward[0] * forwardPull;
      targetY = position[1] + lift + forward[1] * forwardPull;
      targetZ = position[2] + forward[2] * forwardPull + 0.18;
      targetScaleXY = 1.08;
      targetScaleZ = 1.08;
      lambda = 18;
    } else if (selected) {
      const pull = 1.6;
      const lift = 0.35;
      extraRotY = (-Math.PI / 2) * pullDir; // 앞표지가 보이도록
      targetX = position[0] + forward[0] * pull * pullDir;
      targetY = position[1] + lift + forward[1] * pull * pullDir;
      targetZ = position[2] + forward[2] * pull * pullDir;
      targetScaleXY = selectedScale;
      targetScaleZ = selectedScale * selectedDepthScale;
    } else if (hovered) {
      // CLIAR-243: 옆 책을 가리지 않도록 밀림을 최소화(예전 0.25 → 0.05).
      const pull = 0.05;
      targetX = position[0] + forward[0] * pull * pullDir;
      targetY = position[1] + forward[1] * pull * pullDir;
      targetZ = position[2] + forward[2] * pull * pullDir;
    } else {
      targetX = position[0];
      targetY = position[1];
      targetZ = position[2];
    }

    // 프레임 독립적 damping
    g.position.x = THREE.MathUtils.damp(g.position.x, targetX, lambda, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, lambda, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, targetZ, lambda, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, rx, lambda, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ry + extraRotY, lambda, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, rz, lambda, delta);
    g.scale.x = THREE.MathUtils.damp(g.scale.x, targetScaleXY, lambda, delta);
    g.scale.y = THREE.MathUtils.damp(g.scale.y, targetScaleXY, lambda, delta);
    g.scale.z = THREE.MathUtils.damp(g.scale.z, targetScaleZ, lambda, delta);

    // 테두리 glow — hover이거나 드래그 중일 때 은은하게 페이드인
    const glowOn = (hovered || isDragging) && !selected;
    const targetCore = glowOn ? 0.95 : 0;
    const targetHalo = glowOn ? 0.45 : 0;
    const coreMat = edgeCoreRef.current?.material;
    const haloMat = edgeHaloRef.current?.material;
    if (coreMat) {
      coreMat.opacity = THREE.MathUtils.damp(coreMat.opacity, targetCore, 10, delta);
    }
    if (haloMat) {
      haloMat.opacity = THREE.MathUtils.damp(haloMat.opacity, targetHalo, 10, delta);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[rx, ry, rz]}
      onPointerDown={
        interactive
          ? (e) => {
              const native = e.nativeEvent || e;
              const clientX = native.clientX ?? (native.touches && native.touches[0]?.clientX);
              const clientY = native.clientY ?? (native.touches && native.touches[0]?.clientY);
              onDragInitiate?.({ clientX, clientY, nativeEvent: native });
            }
          : undefined
      }
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation();
              setHovered(true);
              onHover?.(true);
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              setHovered(false);
              onHover?.(false);
            }
          : undefined
      }
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onSelect?.(e);
            }
          : undefined
      }
    >
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={size} />
        {/*
         * 테두리 glow (CLIAR-243): 버튼 active 표시처럼 hover/선택된 책의 윤곽만 밝힌다.
         * showEdges가 true일 때만 렌더링.
         */}
        {showEdges && (
          <>
            <Edges
              ref={edgeCoreRef}
              scale={1.001}
              color={glowColor}
              lineWidth={2.5}
              transparent
              opacity={0}
              depthTest={false}
              toneMapped={false}
              raycast={() => null}
            />
            <Edges
              ref={edgeHaloRef}
              scale={1.03}
              color={glowColor}
              lineWidth={6}
              transparent
              opacity={0}
              depthTest={false}
              toneMapped={false}
              raycast={() => null}
            />
          </>
        )}
      </mesh>

      {/*
       * 넓은 투명 히트박스: 얇은 책도 hover/클릭이 잘 잡히도록.
       * CLIAR-243: 고정 최소값(0.5)이 책 사이 간격(0.02)보다 훨씬 커서 옆 책과
       * 히트박스가 크게 겹쳐, 어떤 책은 잘 잡히고 어떤 책은 안 잡히는 원인이었다.
       * 실제 두께에 비례한 여유(최대 +0.06)만 주어 이웃 책을 침범하지 않게 한다.
       */}
      <mesh>
        <boxGeometry args={[size[0] + Math.min(size[0] * 0.6, 0.06), size[1] * 1.1, size[2] * 1.15]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group >
  );
}
