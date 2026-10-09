import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Leva, useControls, folder } from 'leva';
import * as THREE from 'three';
import Book3D from '../bookshelf3d/Book3D';
import { useBooks } from '../../store/booksStore';
import { useTheme } from '../../store/themeStore';
import LibrarianChat from './LibrarianChat';
import LibrarianCursor from './LibrarianCursor';
import BookDetail from './BookDetail';
import ReadingTimerModal from './ReadingTimerModal';
import MobileShelfSheet from './MobileShelfSheet';
import ServiceGuideModal from '../guide/ServiceGuideModal';
import { shouldShowGuideModal } from '../guide/guideStorage';
import { useLibrarian, loadSavedChatSessionByLibrarian } from '../../store/librarianStore';
import { useAuth } from '../../store/authStore';
import { toKoreanStatus } from '../../api/bookApi';
import './LibrarianChat.css';
import { TransformControls } from '@react-three/drei';
import {
  BG_ASPECT,
  getBgSrc,
  getDefaultCamera,
  getDefaultShelves,
  placeBooks,
  makePreviewBooks,
  getShelfFolder,
  getShelfTouchBounds,
} from './shelfLayout';
import { getColorPresets } from '../register/ocrUtils';
import { getColorIndex } from './bookExtractor';
import { useResponsive } from '../../hooks/useResponsive';

const isDev = import.meta.env.DEV;
const CALIB_KEY_PREFIX = 'myReadingRoom.calibration';

function getCalibKey(librarianId) {
  return `${CALIB_KEY_PREFIX}.${librarianId}`;
}

// 카메라를 매 프레임 지정 값으로 세팅 (그림 투시 정합)
function CameraRig({ fov, position, target }) {
  useFrame((state) => {
    const cam = state.camera;
    cam.fov = fov;
    cam.position.set(position[0], position[1], position[2]);
    cam.lookAt(target[0], target[1], target[2]);
    cam.updateProjectionMatrix();
  });
  return null;
}

// 활성 선반 마야 스타일 기즈모 컨트롤러 (중심점: 선반 중앙, Q/W/E/R 단축키 지원)
function ActiveShelfGizmo({
  shelf,
  activeIdx,
  gizmoMode,
  coordSpace,
  onPatchShelf,
}) {
  const groupRef = useRef();
  const isDraggingRef = useRef(false);

  // 상태(shelf)가 단일 기준: 상태가 바뀌면 3D 객체를 항상 상태에 맞춘다 (드래그 중엔 기즈모 값 유지)
  useEffect(() => {
    if (!groupRef.current || isDraggingRef.current) return;
    groupRef.current.position.set(shelf.pos[0], shelf.pos[1], shelf.pos[2]);
    groupRef.current.rotation.set(
      THREE.MathUtils.degToRad(shelf.rotXdeg ?? 0),
      THREE.MathUtils.degToRad(shelf.rotYdeg ?? 0),
      THREE.MathUtils.degToRad(shelf.rotZdeg ?? 0)
    );
    groupRef.current.scale.set(1, 1, 1);
  }, [shelf.pos, shelf.rotXdeg, shelf.rotYdeg, shelf.rotZdeg, activeIdx]);

  // 모드와 상관없이 현재 3D 객체의 전체 변환(위치+회전)을 항상 함께 상태로 기록한다.
  // (예전엔 모드별로 일부 값만 기록해 화면과 복사되는 값이 어긋났음)
  const commitTransform = useCallback(() => {
    const grp = groupRef.current;
    if (!grp) return;
    const patch = {
      pos: [
        Number(grp.position.x.toFixed(2)),
        Number(grp.position.y.toFixed(2)),
        Number(grp.position.z.toFixed(2)),
      ],
      rotXdeg: Number(THREE.MathUtils.radToDeg(grp.rotation.x).toFixed(1)),
      rotYdeg: Number(THREE.MathUtils.radToDeg(grp.rotation.y).toFixed(1)),
      rotZdeg: Number(THREE.MathUtils.radToDeg(grp.rotation.z).toFixed(1)),
    };
    const sx = grp.scale.x;
    const sz = grp.scale.z;
    if (Math.abs(sx - 1) > 0.005 || Math.abs(sz - 1) > 0.005) {
      patch.width = Math.max(0.3, Number((shelf.width * sx).toFixed(2)));
      patch.depth = Math.max(0.1, Number((shelf.depth * sz).toFixed(2)));
      grp.scale.set(1, 1, 1);
    }
    onPatchShelf(activeIdx, patch);
  }, [activeIdx, onPatchShelf, shelf.width, shelf.depth]);

  const handleObjectChange = useCallback(() => {
    // 실제 드래그 중일 때만 기록 (선반 전환 시 reset 방지)
    if (!isDraggingRef.current) return;
    commitTransform();
  }, [commitTransform]);

  const showGizmo = gizmoMode && gizmoMode !== 'select';

  return (
    <>
      <group ref={groupRef}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[shelf.width, 0.02, shelf.depth]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.65} />
        </mesh>
      </group>

      {showGizmo && (
        <TransformControls
          key={`tc-${shelf.id}-${activeIdx}`}
          object={groupRef}
          mode={gizmoMode}
          space={coordSpace}
          size={0.7}
          onMouseDown={() => {
            isDraggingRef.current = true;
          }}
          onMouseUp={() => {
            if (isDraggingRef.current) commitTransform();
            isDraggingRef.current = false;
          }}
          onObjectChange={handleObjectChange}
        />
      )}
    </>
  );
}

// 캘리브레이션 모드에서 각 선반 위치를 반투명 박스로 표시(활성 선반은 마야 기즈모로 조작)
function ShelfGuides({ shelves, activeIdx, onSelectIdx, gizmoMode, coordSpace, onPatchShelf }) {
  return (
    <group>
      {shelves.map((s, i) => {
        if (i === activeIdx) {
          return (
            <ActiveShelfGizmo
              key={`active-${s.id}-${i}`}
              shelf={s}
              activeIdx={i}
              gizmoMode={gizmoMode}
              coordSpace={coordSpace}
              onPatchShelf={onPatchShelf}
            />
          );
        }
        return (
          <mesh
            key={`guide-${s.id}-${i}`}
            position={s.pos}
            rotation={[
              THREE.MathUtils.degToRad(s.rotXdeg ?? 0),
              THREE.MathUtils.degToRad(s.rotYdeg ?? 0),
              THREE.MathUtils.degToRad(s.rotZdeg ?? 0),
            ]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectIdx(i);
            }}
          >
            <boxGeometry args={[s.width, 0.02, s.depth]} />
            <meshBasicMaterial
              color="#ff3b7b"
              transparent
              opacity={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// leva 슬라이더 (카메라 + 활성 선반). calibrating일 때만 마운트됨.
function CalibrationControls({ camera, shelf, activeIdx, onCamera, onCamComp, onShelf, onShelfPos }) {
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 카메라 (마운트 시 1회 초기화)
  useControls(
    () => ({
      카메라: folder({
        fov: { value: camera.fov, min: 10, max: 90, step: 0.5, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onCamera({ fov: v }) },
        posX: { value: camera.position[0], min: -12, max: 12, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onCamComp('position', 0, v) },
        posY: { value: camera.position[1], min: -6, max: 12, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onCamComp('position', 1, v) },
        posZ: { value: camera.position[2], min: 0.5, max: 24, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onCamComp('position', 2, v) },
        tgtX: { value: camera.target[0], min: -12, max: 12, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onCamComp('target', 0, v) },
        tgtY: { value: camera.target[1], min: -6, max: 12, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onCamComp('target', 1, v) },
        tgtZ: { value: camera.target[2], min: -12, max: 12, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onCamComp('target', 2, v) },
      }),
    }),
    []
  );

  // 활성 선반 (activeIdx 바뀌면 해당 선반 값으로 리셋됨)
  const [, setShelfPanel] = useControls(
    () => ({
      [`선반 #${activeIdx + 1} (${shelf.id})`]: folder({
        sPosX: { value: shelf.pos[0], min: -12, max: 12, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelfPos(0, v) },
        sPosY: { value: shelf.pos[1], min: -8, max: 12, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelfPos(1, v) },
        sPosZ: { value: shelf.pos[2], min: -12, max: 12, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelfPos(2, v) },
        rotXdeg: { value: shelf.rotXdeg ?? 0, min: -90, max: 90, step: 0.5, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelf({ rotXdeg: v }) },
        rotYdeg: { value: shelf.rotYdeg ?? 0, min: -90, max: 90, step: 0.5, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelf({ rotYdeg: v }) },
        rotZdeg: { value: shelf.rotZdeg ?? 0, min: -90, max: 90, step: 0.5, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelf({ rotZdeg: v }) },
        width: { value: shelf.width, min: 0.5, max: 12, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelf({ width: v }) },
        depth: { value: shelf.depth, min: 0.2, max: 2, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelf({ depth: v }) },
        bookHeight: { value: shelf.bookHeight ?? 1.1, min: 0.3, max: 3, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelf({ bookHeight: v }) },
        heightVar: { value: shelf.heightVar ?? 0.15, min: 0, max: 1, step: 0.01, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelf({ heightVar: v }) },
        capacity: { value: shelf.capacity ?? 0, min: 0, max: 40, step: 1, onChange: (v, _p, c) => c.fromPanel && isMountedRef.current && onShelf({ capacity: v }) },
      }),
    }),
    [activeIdx, shelf.id]
  );

  // 기즈모(QWER)로 바뀐 값이 슬라이더 패널에도 항상 반영되도록 상태→패널 방향으로 동기화
  // (set은 fromPanel=false라 onChange 핸들러를 타지 않아 되돌아오는 루프가 없다)
  useEffect(() => {
    setShelfPanel({
      sPosX: shelf.pos[0],
      sPosY: shelf.pos[1],
      sPosZ: shelf.pos[2],
      rotXdeg: shelf.rotXdeg ?? 0,
      rotYdeg: shelf.rotYdeg ?? 0,
      rotZdeg: shelf.rotZdeg ?? 0,
      width: shelf.width,
      depth: shelf.depth,
      bookHeight: shelf.bookHeight ?? 1.1,
      heightVar: shelf.heightVar ?? 0.15,
      capacity: shelf.capacity ?? 0,
    });
  }, [
    setShelfPanel,
    shelf.pos,
    shelf.rotXdeg,
    shelf.rotYdeg,
    shelf.rotZdeg,
    shelf.width,
    shelf.depth,
    shelf.bookHeight,
    shelf.heightVar,
    shelf.capacity,
  ]);

  return null;
}

/*
 * 책 hover/선택 시 테두리 glow 색상 (CLIAR-243).
 * index.css의 --accent 값과 동일하게 맞춰, 서재 배경/사서별 팔레트와 일관되게 한다.
 * (CSS 변수를 3D 캔버스 안에서 직접 읽기 어려워 값을 그대로 복제해 둔다)
 */
const GLOW_COLOR = {
  cat: { dark: '#ff7a00', light: '#e06a10' },
  stork: { dark: '#9b7bf0', light: '#7d50c0' },
  nudi: { dark: '#ff5a4e', light: '#e03e30' },
  gecko: { dark: '#ff2a85', light: '#c02f70' },
};

function getGlowColor(librarianId, isDark) {
  const palette = GLOW_COLOR[librarianId] || GLOW_COLOR.cat;
  return isDark ? palette.dark : palette.light;
}

function loadCalibration(librarianId) {
  try {
    const raw = localStorage.getItem(getCalibKey(librarianId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function LibraryScene() {
  const { books } = useBooks();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedId, setSelectedId] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [showGuide, setShowGuide] = useState(() => shouldShowGuideModal());
  const [activeMobileShelfIdx, setActiveMobileShelfIdx] = useState(null);
  const [lastActiveShelfIdx, setLastActiveShelfIdx] = useState(0);
  // 챗봇 답변 대기(thinking) 상태 — 사서 커서(LibrarianCursor)가 대기 이미지로 전환하는 데 사용
  const [chatLoading, setChatLoading] = useState(false);
  // CLIAR-280: 책 위에 커서를 올리면(클릭 없이) 제목/저자를 말풍선으로 보여준다.
  const [hoveredBook, setHoveredBook] = useState(null);
  const [calibrating, setCalibrating] = useState(false);
  // 사서 상태는 전역(LibrarianProvider) — Gnb·사서 프로필 페이지와 공유
  const { activeId: librarianId, librarian } = useLibrarian();
  const { member, isGuest } = useAuth();
  const currentUserId = isGuest ? 'guest' : (member?.member_id || member?.id || member?.sub || member?.email || 'user');

  // CLIAR-257: 추천 도서 등록 후 복귀 시 이전 대화/추천 카드 유지를 위해 사서별 sessionStorage에서 복원
  const [chatAnswer, setChatAnswer] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarianId, currentUserId, 'chat');
    return saved?.answer || null;
  });
  const sceneRef = useRef(null);

  // 사서(librarianId) 또는 사용자 계정 변경 시 커서 말풍선도 해당 사서의 저장된 마지막 응답(또는 null)으로 즉시 교체
  const prevSceneLibrarianRef = useRef(librarianId);
  const prevUserRef = useRef(currentUserId);
  const { isUnifiedMobileUX: isMobile } = useResponsive();
  useEffect(() => {
    if (prevSceneLibrarianRef.current !== librarianId || prevUserRef.current !== currentUserId) {
      prevSceneLibrarianRef.current = librarianId;
      prevUserRef.current = currentUserId;
      const saved = loadSavedChatSessionByLibrarian(librarianId, currentUserId, 'chat');
      setChatAnswer(saved?.answer || null);
    }
  }, [librarianId, currentUserId]);

  const [previewCount, setPreviewCount] = useState(6);
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  // 마야 스타일 QWER 조작 모드 ('select'(Q) | 'translate'(W) | 'rotate'(E) | 'scale'(R))
  const [gizmoMode, setGizmoMode] = useState('translate');
  const [coordSpace, setCoordSpace] = useState('local');

  // Q, W, E, R 단축키 리스너
  useEffect(() => {
    if (!calibrating) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === 'q') setGizmoMode('select');
      else if (key === 'w') setGizmoMode('translate');
      else if (key === 'e') setGizmoMode('rotate');
      else if (key === 'r') setGizmoMode('scale');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calibrating]);

  const [workingConfig, setWorkingConfig] = useState(
    () => loadCalibration(librarianId) || { camera: getDefaultCamera(librarianId), shelves: getDefaultShelves(librarianId) }
  );

  // 사서 전환 시 해당 사서의 캘리브레이션 다시 로드 (없으면 그 사서의 기본값)
  useEffect(() => {
    const saved = loadCalibration(librarianId);
    setWorkingConfig(saved || { camera: getDefaultCamera(librarianId), shelves: getDefaultShelves(librarianId) });
  }, [librarianId]);

  const lastClientPosRef = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 });

  /*
   * 커서 위치 추적 (CLIAR-214).
   * 사서 커서와 손전등 효과는 컨테이너의 --mx/--my를 따른다. 예전에는 씬 컨테이너의
   * onMouseMove로만 갱신했는데, GNB는 fixed 오버레이이면서 씬 컨테이너의 DOM 자식이
   * 아니라 상단 바 위에서는 이벤트가 오지 않아 사서 커서가 멈춰 있었다. 그 상태에서
   * OS 커서까지 숨기면 아무 커서도 안 보이므로, window에서 좌표를 받아 상단 바 위에서도
   * 사서 커서가 따라오게 한다(리렌더 없이 CSS 변수만 갱신).
   * 모바일/터치 기기 환경에서는 pointermove, touchstart, touchmove 이벤트를 추적하며
   * el.scrollLeft 수평 스크롤 위치를 함께 합산하여 모바일 손가락 슬라이딩 중에도
   * 커서 및 조명이 위치를 유지하도록 지원한다.
   */
  useEffect(() => {
    if (calibrating) return;
    const handleMove = (e) => {
      const el = sceneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      // 가로 스크롤 범위가 씬 이미지 영역 범위를 넘어서지 않도록 클램프
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (el.scrollLeft < 0) {
        el.scrollLeft = 0;
      } else if (el.scrollLeft > maxScroll) {
        el.scrollLeft = maxScroll;
      }

      const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
      const clientX = touch ? touch.clientX : (e?.clientX !== undefined ? e.clientX : lastClientPosRef.current.x);
      const clientY = touch ? touch.clientY : (e?.clientY !== undefined ? e.clientY : lastClientPosRef.current.y);
      if (clientX !== undefined && clientY !== undefined) {
        lastClientPosRef.current = { x: clientX, y: clientY };
        const mx = clientX - rect.left + el.scrollLeft;
        const my = clientY - rect.top + el.scrollTop;
        el.style.setProperty('--mx', `${mx}px`);
        el.style.setProperty('--my', `${my}px`);
      }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('touchstart', handleMove, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });

    const el = sceneRef.current;
    if (el) {
      el.addEventListener('scroll', handleMove, { passive: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('touchstart', handleMove);
      window.removeEventListener('touchmove', handleMove);
      if (el) {
        el.removeEventListener('scroll', handleMove);
      }
    };
  }, [calibrating]);

  // 모바일 진입 시 서재 씬 제일 왼쪽(1번 선반)부터 노출되도록 초기 가로 스크롤 정렬
  useEffect(() => {
    if (!isMobile) return;
    const timer = setTimeout(() => {
      const el = sceneRef.current;
      if (el) {
        el.scrollLeft = 0;
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [isMobile]);

  // 서재 페이지에서는 OS 커서를 숨긴다 (CLIAR-214).
  // 씬 컨테이너는 cursor:none이지만 #root 고정폭(1126px) 바깥 레터박스나 씬 박스
  // 주변 여백으로 마우스가 나가면 body의 기본 커서가 드러나, 사서 커서 위를 지나
  // 좌우로 움직일 때 일반 포인터가 튀어 보였다. body에 클래스를 걸어 서재에 있는
  // 동안 커서를 감춘다. 버튼·링크는 각자 cursor를 지정하므로 클릭 대상엔 여전히
  // 포인터가 보인다.
  useEffect(() => {
    document.body.classList.add('reading-room');
    return () => document.body.classList.remove('reading-room');
  }, []);

  useEffect(() => {
    if (!isDev) return;
    try {
      localStorage.setItem(getCalibKey(librarianId), JSON.stringify(workingConfig));
    } catch {
      // 무시
    }
  }, [workingConfig, librarianId]);

  // ── 편집 핸들러 (함수형 업데이트로 stale closure 방지) ──
  const patchCamera = useCallback((patch) => {
    setWorkingConfig((prev) => ({ ...prev, camera: { ...prev.camera, ...patch } }));
  }, []);
  const setCamComp = useCallback((vecKey, idx, v) => {
    setWorkingConfig((prev) => {
      const arr = [...prev.camera[vecKey]];
      arr[idx] = v;
      return { ...prev, camera: { ...prev.camera, [vecKey]: arr } };
    });
  }, []);
  const patchShelf = useCallback((idx, patch) => {
    setWorkingConfig((prev) => ({
      ...prev,
      shelves: prev.shelves.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }, []);
  const setShelfPos = useCallback((idx, i, v) => {
    setWorkingConfig((prev) => ({
      ...prev,
      shelves: prev.shelves.map((s, k) => {
        if (k !== idx) return s;
        const pos = [...s.pos];
        pos[i] = v;
        return { ...s, pos };
      }),
    }));
  }, []);

  const addShelf = () => {
    setWorkingConfig((prev) => {
      const base = prev.shelves[activeIdx] || { id: 'shelf', pos: [0, 0, 0], rotXdeg: 0, rotYdeg: 0, rotZdeg: 0, width: 3.5, depth: 0.82, bookHeight: 1.1, heightVar: 0.15 };
      const shelves = [
        ...prev.shelves,
        { ...base, id: `shelf${prev.shelves.length + 1}`, pos: [base.pos[0], base.pos[1] - 1.2, base.pos[2]] },
      ];
      setActiveIdx(shelves.length - 1);
      return { ...prev, shelves };
    });
  };
  const deleteShelf = (idx) => {
    setWorkingConfig((prev) => {
      if (prev.shelves.length <= 1) return prev;
      const shelves = prev.shelves.filter((_, i) => i !== idx);
      setActiveIdx((a) => Math.max(0, Math.min(a, shelves.length - 1)));
      return { ...prev, shelves };
    });
  };
  const moveShelf = (idx, dir) => {
    const j = idx + dir;
    setWorkingConfig((prev) => {
      if (j < 0 || j >= prev.shelves.length) return prev;
      const shelves = [...prev.shelves];
      [shelves[idx], shelves[j]] = [shelves[j], shelves[idx]];
      return { ...prev, shelves };
    });
    if (j >= 0 && j < workingConfig.shelves.length) setActiveIdx(j);
  };

  const resetToDefaults = () => {
    setWorkingConfig({ camera: getDefaultCamera(librarianId), shelves: getDefaultShelves(librarianId) });
    setActiveIdx(0);
    try {
      localStorage.removeItem(getCalibKey(librarianId));
    } catch {
      // 무시
    }
  };

  const copyJson = async () => {
    const { camera, shelves } = workingConfig;
    const camName = `${librarianId.toUpperCase()}_CAMERA`;
    const shelvesName = `${librarianId.toUpperCase()}_SHELVES`;
    const text = `// ${librarian.name} (${librarianId}) 서재 배치\nconst ${camName} = ${JSON.stringify(camera, null, 2)};\n\nconst ${shelvesName} = ${JSON.stringify(shelves, null, 2)};`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 무시
    }
  };

  // 현재 활성 선반의 설정을 localStorage에 확정 저장하고 JSON을 클립보드로 복사
  const saveAndCopyCurrentShelf = async () => {
    try {
      localStorage.setItem(getCalibKey(librarianId), JSON.stringify(workingConfig));
    } catch {
      // 무시
    }
    const curShelf = workingConfig.shelves[activeIdx];
    if (curShelf) {
      const text = JSON.stringify(curShelf, null, 2) + ',';
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // 무시
      }
    }
    setSaveToast(`선반 #${activeIdx + 1} 저장&복사됨!`);
    setTimeout(() => setSaveToast(''), 2000);
  };

  // shelfLayout.js에 저장된 최신 코드값으로 즉시 동기화
  const syncFromFile = () => {
    const freshConfig = {
      camera: getDefaultCamera(librarianId),
      shelves: getDefaultShelves(librarianId),
    };
    setWorkingConfig(freshConfig);
    try {
      localStorage.setItem(getCalibKey(librarianId), JSON.stringify(freshConfig));
    } catch {
      // 무시
    }
    setSaveToast('코드 최신값 동기화 완료!');
    setTimeout(() => setSaveToast(''), 2000);
  };

  // 캘리브레이션 중이면 작업용 설정, 아니면 해당 사서의 배포용 기본 설정
  const activeConfig = calibrating ? workingConfig : { camera: getDefaultCamera(librarianId), shelves: getDefaultShelves(librarianId) };
  const librarianPresets = useMemo(() => getColorPresets(librarianId), [librarianId]);
  const rawSourceBooks = calibrating ? makePreviewBooks(previewCount, librarianId) : books;
  const sourceBooks = useMemo(() => {
    return rawSourceBooks.map((b) => {
      const colorIdx = typeof b.colorIdx === 'number' ? b.colorIdx : getColorIndex(b.title || b.id || '');
      const preset = librarianPresets[colorIdx % librarianPresets.length];
      return {
        ...b,
        colorIdx,
        spineColor: preset.spine,
        coverColor: preset.cover,
      };
    });
  }, [rawSourceBooks, librarianPresets]);
  const placements = useMemo(() => placeBooks(sourceBooks, activeConfig.shelves), [sourceBooks, activeConfig.shelves]);
  const { camera } = activeConfig;
  const activeShelf = workingConfig.shelves[activeIdx] || workingConfig.shelves[0];

  const currentShelfBounds = useMemo(() => getShelfTouchBounds(librarianId), [librarianId]);
  const shelfFolder = useMemo(() => getShelfFolder(librarianId), [librarianId]);

  return (
    <div
      ref={sceneRef}
      className="library-scene-container"
      style={{
        position: 'relative',
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        height: '100svh',
        cursor: calibrating ? 'auto' : 'none',
        // 모바일에서는 손가락 슬라이딩으로 전체 씬(좌/중앙/우)을 구경할 수 있도록 가로 스크롤 허용, 세로는 고정
        overflowX: isMobile ? 'auto' : 'hidden',
        overflowY: 'hidden',
        touchAction: 'pan-x',
        WebkitOverflowScrolling: 'touch',
        background: '#0a0806',
        '--mx': '50%',
        '--my': '50%',
      }}
    >
      {isDev && calibrating && <Leva collapsed={false} />}

      {/*
       * CLIAR-288: 배경 그림과 3D 캔버스를 같은 16:9 레이어에 담아, 이 레이어를
       * 뷰포트를 덮도록 확대(cover)하고 하단 정렬한다. 화면이 16:9보다 넓으면(짧으면)
       * 레이어가 뷰포트보다 커져 위쪽이 잘리고, 좁으면 좌우가 잘린다.
       * 배경과 캔버스가 항상 같은 16:9 박스를 공유하므로 3D 책과 책장 정합이 유지된다.
       */}
      <div
        style={{
          position: 'absolute',
          left: isMobile ? 0 : '50%',
          bottom: 0,
          transform: isMobile ? 'none' : 'translateX(-50%)',
          width: `max(100vw, calc(100svh * ${BG_ASPECT}))`,
          aspectRatio: String(BG_ASPECT),
          backgroundImage: `url(${getBgSrc(librarianId, isDark)})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: isMobile ? 'left bottom' : 'center',
        }}
      >
        <Canvas
          gl={{ alpha: true, antialias: true }}
          style={{ position: 'absolute', inset: 0 }}
          camera={{ position: camera.position, fov: camera.fov }}
        >
          <CameraRig fov={camera.fov} position={camera.position} target={camera.target} />

          <ambientLight intensity={0.8} />
          <directionalLight position={[4, 8, 6]} intensity={1.0} />
          <directionalLight position={[-5, 3, 4]} intensity={0.3} />

          {calibrating && (
            <ShelfGuides
              shelves={activeConfig.shelves}
              activeIdx={activeIdx}
              onSelectIdx={setActiveIdx}
              gizmoMode={gizmoMode}
              coordSpace={coordSpace}
              onPatchShelf={patchShelf}
            />
          )}

          {placements.map((b) => (
            <Book3D
              key={b.id}
              position={b.position}
              size={b.size}
              rotation={b.rotation}
              spineColor={b.spineColor}
              coverColor={b.coverColor}
              selected={selectedId === b.id}
              glowColor={getGlowColor(librarianId, isDark)}
              onSelect={() => {
                if (isMobile) {
                  const sIdx = b.shelfIndex ?? 0;
                  setLastActiveShelfIdx(sIdx);
                  setActiveMobileShelfIdx(sIdx);
                } else {
                  setSelectedId((prev) => (prev === b.id ? null : b.id));
                }
              }}
              onHover={(over) =>
                setHoveredBook((cur) => (over ? b : cur?.id === b.id ? null : cur))
              }
            />
          ))}
        </Canvas>

        {/* 손전등 효과: 다크 모드 전환 시 0.35s 부드러운 opacity 페이드인/아웃으로 깜빡임 및 처리 보임 현상 해결 (캘리브레이션 중엔 끔) */}
        {!calibrating && (
          <>
            {/*
             * 어둡게 하는 비네트 (CLIAR-181: 손전등이 비추는 부분만 보이도록 훨씬 더 어둡게)
             * CLIAR-249: 비추는 범위를 30% 넓힘 (75px→98px, 140px→182px)
             * CLIAR-301: 야간 모드 시야를 조금 더 확보하기 위해 15% 추가 확대 (98px→113px, 182px→209px)
             */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 5,
                opacity: isDark ? 1 : 0,
                transition: 'opacity 0.35s ease',
                background:
                  'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(5,3,1,0) 0px, rgba(5,3,1,0.55) 113px, rgba(5,3,1,0.97) 209px)',
              }}
            />
            {/*
             * 커서 주변 밝은 글로우 (빛을 더함, CLIAR-181: 범위 50% 축소)
             * CLIAR-249: 비네트와 함께 30% 넓힘 (60px→78px, 115px→150px)
             * CLIAR-301: 비네트와 같은 비율로 15% 추가 확대 (78px→90px, 150px→173px)
             */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 6,
                mixBlendMode: 'screen',
                opacity: isDark ? 1 : 0,
                transition: 'opacity 0.35s ease',
                background:
                  'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,214,150,0.4) 0px, rgba(255,200,130,0.2) 90px, rgba(255,190,120,0) 173px)',
              }}
            />
          </>
        )}

        {/* 모바일 사서별 선반 터치 영역 & 선택 시 사서별 선반 오버레이 이미지 */}
        {isMobile && !calibrating && (
          <>
            {/* 선택된 선반 하이라이트 오버레이 (cat_shelves / stork_shelves / nudi_shelves / gecko_shelves / 1.png~N.png 이미지) */}
            {activeMobileShelfIdx !== null && activeMobileShelfIdx < currentShelfBounds.length && (
              <img
                src={`/${shelfFolder}/${activeMobileShelfIdx + 1}.png`}
                alt={`선반 ${activeMobileShelfIdx + 1} 하이라이트`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 6,
                  objectFit: 'cover',
                  filter: 'drop-shadow(0 0 10px var(--accent, #ff9a3c))',
                }}
              />
            )}

            {/* 선반 터치 오버레이 레이어 */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', zIndex: 7 }}>
              {currentShelfBounds.map((bound, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setLastActiveShelfIdx(i);
                    setActiveMobileShelfIdx(i);
                  }}
                  style={{
                    position: 'absolute',
                    top: bound.top,
                    height: bound.height,
                    left: bound.left ?? '0%',
                    width: bound.width ?? '100%',
                    cursor: 'pointer',
                    backgroundColor: activeMobileShelfIdx === i ? 'rgba(255, 154, 60, 0.12)' : 'transparent',
                    transition: 'background-color 0.2s ease',
                    borderRadius: 6,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {isDev && calibrating && (
        <CalibrationControls
          key={`calib-shelf-${activeShelf?.id || activeIdx}-${librarianId}`}
          camera={workingConfig.camera}
          shelf={activeShelf}
          activeIdx={activeIdx}
          onCamera={patchCamera}
          onCamComp={setCamComp}
          onShelf={(patch) => patchShelf(activeIdx, patch)}
          onShelfPos={(i, v) => setShelfPos(activeIdx, i, v)}
        />
      )}

      {/* 마야 스타일 QWER 트랜스폼 모드 툴바 */}
      {isDev && calibrating && (
        <div
          style={{
            position: 'fixed',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(18, 18, 24, 0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(255, 255, 255, 0.25)',
            borderRadius: 999,
            padding: '5px 12px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              title="이전 선반"
              style={{
                background: 'transparent',
                border: 'none',
                color: activeIdx === 0 ? 'rgba(255,255,255,0.25)' : '#fff',
                cursor: activeIdx === 0 ? 'default' : 'pointer',
                fontSize: 12,
                padding: '2px 5px',
              }}
            >
              ◀
            </button>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#ff9a3c', minWidth: 62, textAlign: 'center' }}>
              #{activeIdx + 1} {workingConfig.shelves[activeIdx]?.id || ''}
            </span>
            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.min(workingConfig.shelves.length - 1, i + 1))}
              disabled={activeIdx >= workingConfig.shelves.length - 1}
              title="다음 선반"
              style={{
                background: 'transparent',
                border: 'none',
                color: activeIdx >= workingConfig.shelves.length - 1 ? 'rgba(255,255,255,0.25)' : '#fff',
                cursor: activeIdx >= workingConfig.shelves.length - 1 ? 'default' : 'pointer',
                fontSize: 12,
                padding: '2px 5px',
              }}
            >
              ▶
            </button>
          </div>
          {[
            { mode: 'select', key: 'Q', label: '선택' },
            { mode: 'translate', key: 'W', label: '이동' },
            { mode: 'rotate', key: 'E', label: '회전' },
            { mode: 'scale', key: 'R', label: '크기' },
          ].map((m) => {
            const active = gizmoMode === m.mode;
            return (
              <button
                key={m.mode}
                type="button"
                onClick={() => setGizmoMode(m.mode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: active ? '1.5px solid var(--accent, #ff9a3c)' : '1px solid rgba(255,255,255,0.15)',
                  background: active ? 'var(--accent, #ff9a3c)' : 'rgba(255,255,255,0.08)',
                  color: active ? '#111' : '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <kbd
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: active ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {m.key}
                </kbd>
                {m.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCoordSpace((prev) => (prev === 'local' ? 'world' : 'local'))}
            title="좌표계 전환 (Local / World)"
            style={{
              marginLeft: 4,
              padding: '5px 10px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.12)',
              color: '#00e5ff',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {coordSpace === 'local' ? 'Local 축' : 'World 축'}
          </button>

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

          {/* 저장 & 복사 버튼 */}
          <button
            type="button"
            onClick={saveAndCopyCurrentShelf}
            title="현재 선반 상태를 로컬 저장하고 JSON을 클립보드에 복사합니다"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 13px',
              borderRadius: 999,
              border: '1.5px solid rgba(52, 211, 153, 0.7)',
              background: 'rgba(16, 185, 129, 0.28)',
              color: '#34d399',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(52, 211, 153, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            💾 {saveToast || '선반 저장 & 복사'}
          </button>

          {/* 코드값 동기화 버튼 */}
          <button
            type="button"
            onClick={syncFromFile}
            title="shelfLayout.js의 최신 설정값으로 화면을 즉시 동기화합니다"
            style={{
              padding: '5px 11px',
              borderRadius: 999,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🔄 코드값 동기화
          </button>
        </div>
      )}

      {/*
       * 개발 모드 캘리브레이션 진입 버튼.
       * GNB 오버레이(.gnb--overlay)가 z-index:30으로 항상 화면 위에 떠 있어,
       * 이 버튼이 GNB 로고 뒤에 깔려 클릭이 안 되는 문제가 있었다(사용자 요청, 2026-09).
       * GNB보다 높은 z-index를 줘서 항상 클릭 가능하게 한다.
       */}
      {isDev && !calibrating && (
        <button
          onClick={() => setCalibrating(true)}
          style={{ position: 'absolute', top: 10, left: 10, zIndex: 40, fontSize: 16, padding: '4px 8px', opacity: 0.7 }}
        >
          캘리브레이션
        </button>
      )}

      {/* 캘리브레이션 구조 조작 바 (선반 선택/추가/순서/복사) — 같은 이유로 GNB보다 위에 오도록 zIndex 지정 */}
      {isDev && calibrating && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            zIndex: 40,
            background: 'rgba(20,20,24,0.92)',
            color: '#eee',
            padding: 10,
            borderRadius: 8,
            fontSize: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxWidth: 260,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>선반 편집</strong>
            <button onClick={() => setCalibrating(false)} style={{ fontSize: 15 }}>닫기</button>
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {workingConfig.shelves.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveIdx(i)}
                title={s.id}
                style={{
                  fontSize: 15,
                  padding: '2px 7px',
                  background: i === activeIdx ? '#00e5ff' : '#333',
                  color: i === activeIdx ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {i + 1}
              </button>
            ))}
            <button onClick={addShelf} style={{ fontSize: 15, padding: '2px 7px' }}>+ 추가</button>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => moveShelf(activeIdx, -1)} style={{ fontSize: 15 }}>↑ 순서</button>
            <button onClick={() => moveShelf(activeIdx, 1)} style={{ fontSize: 15 }}>↓ 순서</button>
            <button onClick={() => deleteShelf(activeIdx)} style={{ fontSize: 15, color: '#f88' }}>선반 삭제</button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            미리보기 책 수
            <input
              type="number"
              min={0}
              max={40}
              value={previewCount}
              onChange={(e) => setPreviewCount(Number(e.target.value))}
              style={{ width: 50, background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }}
            />
          </label>

          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={copyJson} style={{ flex: 1, padding: '6px 0', fontWeight: 700 }}>
              {copied ? '복사됨!' : '설정 JSON 복사'}
            </button>
            <button onClick={resetToDefaults} style={{ fontSize: 15 }}>기본값 초기화</button>
          </div>
          <span style={{ color: '#999', lineHeight: 1.4 }}>
            수치 조절은 우측 leva 슬라이더에서. 다 맞추면 JSON 복사 → shelfLayout.js의 DEFAULT_* 교체.
          </span>
        </div>
      )}

      {/* CLIAR-280: 책 호버 시 제목/저자 말풍선 툴팁.
          커서(--mx/--my)를 따라 커서 위쪽에 뜨며, 클릭(선택)한 책에는 표시하지 않는다. */}
      {!calibrating && hoveredBook && hoveredBook.id !== selectedId && (
        <div
          style={{
            position: 'absolute',
            left: 'var(--mx, 50%)',
            top: 'var(--my, 50%)',
            transform: 'translate(-50%, calc(-100% - 18px))',
            maxWidth: 220,
            // CLIAR-301: 사서 말풍선·채팅창과 동일한 배경 톤으로 통일
            background: 'var(--bubble-bg)',
            color: 'var(--text-h)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '8px 12px',
            fontSize: 17,
            lineHeight: 1.45,
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            wordBreak: 'break-word',
            zIndex: 10,
          }}
        >
          <span style={{ fontWeight: 700 }}>📖 {hoveredBook.title || '제목 미상'}</span>
          {hoveredBook.author && (
            <span style={{ display: 'block', fontSize: 16, color: 'var(--text)', marginTop: 2 }}>
              ✍️ {hoveredBook.author}
            </span>
          )}
          {/* 말풍선 아래쪽 꼬리 */}
          <span
            style={{
              position: 'absolute',
              left: '50%',
              bottom: -7,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid var(--border)',
            }}
          />
        </div>
      )}

      {/* 마우스를 따라다니는 사서 + 우상단 말풍선(답변).
          커서 모션은 hover가 아니라 책을 선택(클릭)했을 때만 전환된다 (CLIAR-239). */}
      {!calibrating && (
        <LibrarianCursor
          librarian={librarian}
          answer={chatAnswer}
          active={selectedId != null}
          thinking={chatLoading}
        />
      )}

      {/* 사서 질문 입력 패널 (오른쪽 하단) */}
      {!calibrating && (
        <LibrarianChat
          librarian={librarian}
          answer={chatAnswer}
          onAnswer={setChatAnswer}
          onLoadingChange={setChatLoading}
          onOpenTimer={() => setShowTimer(true)}
          onOpenDetail={(bookOrId) => {
            if (typeof bookOrId === 'object' && bookOrId !== null) {
              const bookId = bookOrId.book_id ?? bookOrId.bookId ?? bookOrId.id;
              const found = books.find(
                (b) =>
                  b.bookId === bookId ||
                  b.id === String(bookId) ||
                  b.id === bookId ||
                  b.title === bookOrId.title
              );
              if (found) {
                setSelectedId(found.id);
              } else {
                setSelectedId({
                  id: String(bookId || 'custom'),
                  bookId: bookId,
                  title: bookOrId.title,
                  author: bookOrId.author,
                  status: toKoreanStatus(bookOrId.reading_status || bookOrId.readingStatus || bookOrId.status),
                  progress: bookOrId.progress,
                });
              }
            } else {
              const found = books.find(
                (b) =>
                  b.bookId === bookOrId ||
                  b.id === String(bookOrId) ||
                  b.id === bookOrId ||
                  b.title === bookOrId
              );
              if (found) {
                setSelectedId(found.id);
              } else {
                setSelectedId(bookOrId);
              }
            }
          }}
        />
      )}

      {/* 데스크톱 전용 독서 타이머 플로팅 버튼 (모바일은 사서 플로팅 미니 메뉴에 포함) */}
      {!calibrating && !isMobile && (
        <div
          style={{
            position: 'fixed',
            right: 'min(16px, 2vw)',
            bottom: 'min(76px, calc(2vh + 60px))',
            zIndex: 19,
            fontSize: 17,
          }}
        >
          <button
            type="button"
            className="lc-timer-toggle-btn"
            onClick={() => setShowTimer(true)}
            aria-label="독서 집중 타이머 시작"
            title="독서 집중 타이머 시작"
          >
            <span style={{ fontSize: 20 }}>⏱️</span>
            독서 타이머
          </button>
        </div>
      )}

      {/* 서비스 이용 가이드 팝업 모달 */}
      <ServiceGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />

      {/* 독서 집중 타이머 모달 */}
      {showTimer && (
        <ReadingTimerModal
          onClose={() => setShowTimer(false)}
          onOpenBookDetail={(book) => {
            if (book) setSelectedId(book.id || book.bookId);
          }}
        />
      )}

      {/* 선택된 책 상세 팝업 (확대된 책 오른쪽) */}
      {selectedId && (() => {
        const book =
          typeof selectedId === 'object'
            ? selectedId
            : sourceBooks.find(
              (b) =>
                b.id === selectedId ||
                b.bookId === selectedId ||
                String(b.bookId) === String(selectedId) ||
                b.title === selectedId
            );
        return book ? (
          <BookDetail
            book={book}
            onClose={() => setSelectedId(null)}
            onBackToShelf={
              isMobile
                ? () => {
                  const targetShelfIdx = lastActiveShelfIdx ?? book.shelfIndex ?? 0;
                  setSelectedId(null);
                  setActiveMobileShelfIdx(targetShelfIdx);
                }
                : undefined
            }
          />
        ) : null;
      })()}

      {/* 모바일 선반 도서 수직 스크롤 바텀시트 */}
      {isMobile && activeMobileShelfIdx !== null && (
        <MobileShelfSheet
          activeShelfIdx={activeMobileShelfIdx}
          totalShelves={currentShelfBounds.length}
          onSelectShelf={(idx) => {
            setLastActiveShelfIdx(idx);
            setActiveMobileShelfIdx(idx);
          }}
          onClose={() => setActiveMobileShelfIdx(null)}
          placements={placements}
          allBooks={sourceBooks}
          onOpenBookDetail={(book) => {
            const sIdx = activeMobileShelfIdx ?? book.shelfIndex ?? 0;
            setLastActiveShelfIdx(sIdx);
            setSelectedId(book.id || book.bookId);
          }}
        />
      )}
    </div>
  );
}
