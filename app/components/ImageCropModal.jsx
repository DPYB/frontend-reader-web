import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ImageCropModal — 사진 업로드/촬영 후 원하는 영역(네모칸)만 마우스/터치 드래그로 잘라내는 스마트 크롭 모달.
 *
 * @param {object} props
 * @param {string|File|Blob} props.imageSource - 원본 이미지 (File, Blob, 또는 objectURL)
 * @param {string} [props.title='영역 선택 및 자르기'] - 모달 타이틀
 * @param {'free'|'square'} [props.aspectMode='free'] - 'free': 문장 수집용 자유 사각형, 'square': 프로필 사진용 1:1 정사각
 * @param {(croppedBlob: Blob, croppedDataUrl: string) => void} props.onCropComplete - 크롭 완료 콜백
 * @param {() => void} props.onClose - 취소/닫기 콜백
 */
export default function ImageCropModal({
  imageSource,
  title = '영역 선택 및 자르기',
  aspectMode = 'free',
  onCropComplete,
  onClose,
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const [imageUrl, setImageUrl] = useState('');

  // StrictMode 언마운트/리마운트에서 URL이 즉시 파기되는 문제를 방지
  useEffect(() => {
    if (!imageSource) {
      setImageUrl('');
      return;
    }
    if (typeof imageSource === 'string') {
      setImageUrl(imageSource);
      return;
    }
    if (imageSource instanceof Blob || imageSource instanceof File) {
      const url = URL.createObjectURL(imageSource);
      setImageUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageSource]);

  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0, left: 0, top: 0 });

  // 0.0 ~ 1.0 정규화된 비율 좌표 { x, y, width, height }
  const [crop, setCrop] = useState({ x: 0.1, y: 0.2, width: 0.8, height: 0.6 });
  const [dragState, setDragState] = useState(null);
  const [processing, setProcessing] = useState(false);

  // 이미지 렌더링 크기 및 위치 계산
  const updateRenderedSize = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const rect = img.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setRenderedSize({
      width: rect.width,
      height: rect.height,
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
    });
  }, []);


  // 이미지 로드 완료 시
  const handleImageLoad = (e) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    updateRenderedSize();

    // 초기 크롭 박스 설정
    if (aspectMode === 'square') {
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const wRatio = (minDim / img.naturalWidth) * 0.7;
      const hRatio = (minDim / img.naturalHeight) * 0.7;
      setCrop({
        x: (1 - wRatio) / 2,
        y: (1 - hRatio) / 2,
        width: wRatio,
        height: hRatio,
      });
    } else {
      // 캡처 도구 방식: 기본 중앙 영역을 직관적으로 잡아주고, 배경 드래그로 언제든 다시 그릴 수 있음
      setCrop({ x: 0.1, y: 0.3, width: 0.8, height: 0.4 });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateRenderedSize);
    return () => window.removeEventListener('resize', updateRenderedSize);
  }, [updateRenderedSize]);

  // 포인터(마우스/터치) 드래그 핸들러
  const handlePointerDown = (type, e) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (type === 'draw') {
      if (!imageRef.current || renderedSize.width === 0 || renderedSize.height === 0) return;
      const imgRect = imageRef.current.getBoundingClientRect();
      const startNormX = Math.max(0, Math.min(1, (clientX - imgRect.left) / renderedSize.width));
      const startNormY = Math.max(0, Math.min(1, (clientY - imgRect.top) / renderedSize.height));

      setCrop({ x: startNormX, y: startNormY, width: 0.01, height: 0.01 });
      setDragState({
        type: 'draw',
        startX: clientX,
        startY: clientY,
        originX: startNormX,
        originY: startNormY,
        initialCrop: { x: startNormX, y: startNormY, width: 0.01, height: 0.01 },
      });
      return;
    }

    setDragState({
      type,
      startX: clientX,
      startY: clientY,
      initialCrop: { ...crop },
    });
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragState || renderedSize.width === 0 || renderedSize.height === 0) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const dx = (clientX - dragState.startX) / renderedSize.width;
      const dy = (clientY - dragState.startY) / renderedSize.height;

      const { type, initialCrop, originX, originY } = dragState;

      // 1. 캡처 도구처럼 배경 드래그로 새로 그리기
      if (type === 'draw') {
        const currentNormX = Math.max(0, Math.min(1, originX + dx));
        const currentNormY = Math.max(0, Math.min(1, originY + dy));

        let nx = Math.min(originX, currentNormX);
        let ny = Math.min(originY, currentNormY);
        let nw = Math.max(0.02, Math.abs(currentNormX - originX));
        let nh = Math.max(0.02, Math.abs(currentNormY - originY));

        if (aspectMode === 'square' && naturalSize.width > 0 && naturalSize.height > 0) {
          const pixelW = nw * naturalSize.width;
          const pixelH = nh * naturalSize.height;
          const side = Math.max(pixelW, pixelH);
          nw = side / naturalSize.width;
          nh = side / naturalSize.height;
          if (nx + nw > 1) nw = 1 - nx;
          if (ny + nh > 1) nh = 1 - ny;
        }

        setCrop({ x: nx, y: ny, width: nw, height: nh });
        return;
      }

      // 2. 박스 전체 이동
      if (type === 'move') {
        const nextX = Math.max(0, Math.min(1 - initialCrop.width, initialCrop.x + dx));
        const nextY = Math.max(0, Math.min(1 - initialCrop.height, initialCrop.y + dy));
        setCrop({ ...initialCrop, x: nextX, y: nextY });
        return;
      }

      // 3. 모서리 및 핸들 리사이징
      let nx = initialCrop.x;
      let ny = initialCrop.y;
      let nw = initialCrop.width;
      let nh = initialCrop.height;

      if (type.includes('w')) {
        const maxDx = initialCrop.width - 0.05;
        const actualDx = Math.max(-initialCrop.x, Math.min(maxDx, dx));
        nx = initialCrop.x + actualDx;
        nw = initialCrop.width - actualDx;
      }
      if (type.includes('e')) {
        nw = Math.max(0.05, Math.min(1 - initialCrop.x, initialCrop.width + dx));
      }
      if (type.includes('n')) {
        const maxDy = initialCrop.height - 0.05;
        const actualDy = Math.max(-initialCrop.y, Math.min(maxDy, dy));
        ny = initialCrop.y + actualDy;
        nh = initialCrop.height - actualDy;
      }
      if (type.includes('s')) {
        nh = Math.max(0.05, Math.min(1 - initialCrop.y, initialCrop.height + dy));
      }

      // 1:1 정사각 모드 보정
      if (aspectMode === 'square' && naturalSize.width > 0 && naturalSize.height > 0) {
        if (type.includes('e') || type.includes('w')) {
          nh = (nw * naturalSize.width) / naturalSize.height;
        } else {
          nw = (nh * naturalSize.height) / naturalSize.width;
        }
        if (nx + nw > 1) nw = 1 - nx;
        if (ny + nh > 1) nh = 1 - ny;
      }

      setCrop({ x: Math.max(0, nx), y: Math.max(0, ny), width: nw, height: nh });
    },
    [dragState, renderedSize, aspectMode, naturalSize]
  );

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [dragState, handlePointerMove, handlePointerUp]);

  // 전체 선택 버튼
  const handleSelectAll = () => {
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
  };

  // 영역 초기화 (중앙 70%)
  const handleReset = () => {
    if (aspectMode === 'square') {
      const minDim = Math.min(naturalSize.width, naturalSize.height);
      const wRatio = (minDim / naturalSize.width) * 0.7;
      const hRatio = (minDim / naturalSize.height) * 0.7;
      setCrop({
        x: (1 - wRatio) / 2,
        y: (1 - hRatio) / 2,
        width: wRatio,
        height: hRatio,
      });
    } else {
      setCrop({ x: 0.1, y: 0.25, width: 0.8, height: 0.5 });
    }
  };

  // 자르기 및 추출 (HTML5 Canvas Blob 생성)
  const handleConfirmCrop = async () => {
    if (!imageRef.current || naturalSize.width === 0) return;
    setProcessing(true);

    try {
      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const srcX = Math.round(crop.x * naturalSize.width);
      const srcY = Math.round(crop.y * naturalSize.height);
      const srcW = Math.round(crop.width * naturalSize.width);
      const srcH = Math.round(crop.height * naturalSize.height);

      canvas.width = Math.max(1, srcW);
      canvas.height = Math.max(1, srcH);

      if (ctx) {
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setProcessing(false);
            return;
          }
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
          onCropComplete(blob, croppedDataUrl);
          setProcessing(false);
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      console.error('크롭 실패:', err);
      setProcessing(false);
    }
  };

  // 픽셀 단위 박스 스타일 계산
  const cropBoxStyle = {
    position: 'absolute',
    left: `${renderedSize.left + crop.x * renderedSize.width}px`,
    top: `${renderedSize.top + crop.y * renderedSize.height}px`,
    width: `${crop.width * renderedSize.width}px`,
    height: `${crop.height * renderedSize.height}px`,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
    border: '2px solid var(--accent)',
    cursor: 'move',
    touchAction: 'none',
    boxSizing: 'border-box',
    borderRadius: aspectMode === 'square' ? '4px' : '2px',
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          color: 'var(--text-h)',
        }}
      >
        {/* 상단 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--code-bg)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-h)' }}>{title}</h3>
            <span style={{ fontSize: '13px', color: 'var(--text)', opacity: 0.85 }}>
              {aspectMode === 'square'
                ? '원하는 프로필 영역을 네모칸으로 맞춰주세요.'
                : '마우스로 사진 위를 드래그하여 추출할 문장 영역을 자유롭게 그려보세요.'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* 중앙 크롭 뷰포트 */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            flex: 1,
            minHeight: '340px',
            maxHeight: '58vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: '#000000',
            userSelect: 'none',
            touchAction: 'none',
            cursor: 'crosshair',
          }}
        >
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="크롭 대상"
              onLoad={handleImageLoad}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* 캡처 도구 방식: 이미지 영역 위에서 드래그하여 새로 그리는 레이어 */}
          {renderedSize.width > 0 && (
            <div
              onPointerDown={(e) => handlePointerDown('draw', e)}
              style={{
                position: 'absolute',
                left: `${renderedSize.left}px`,
                top: `${renderedSize.top}px`,
                width: `${renderedSize.width}px`,
                height: `${renderedSize.height}px`,
                cursor: 'crosshair',
                touchAction: 'none',
                zIndex: 1,
              }}
            />
          )}

          {/* 사각 크롭 조절 박스 */}
          {renderedSize.width > 0 && (
            <div
              style={{ ...cropBoxStyle, zIndex: 2 }}
              onPointerDown={(e) => handlePointerDown('move', e)}
            >
              {/* 그리드 가이드라인 (삼분할선) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gridTemplateRows: '1fr 1fr 1fr',
                  pointerEvents: 'none',
                  opacity: 0.35,
                }}
              >
                <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                <div style={{ borderBottom: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff', borderBottom: '1px dashed #fff' }} />
                <div style={{ borderBottom: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff' }} />
                <div style={{ borderRight: '1px dashed #fff' }} />
                <div />
              </div>

              {/* 4대 모서리 핸들 (크고 터치하기 편하게 20px) */}
              {['nw', 'ne', 'se', 'sw'].map((handle) => {
                const isTop = handle.includes('n');
                const isLeft = handle.includes('w');
                return (
                  <div
                    key={handle}
                    onPointerDown={(e) => handlePointerDown(handle, e)}
                    style={{
                      position: 'absolute',
                      top: isTop ? -8 : 'auto',
                      bottom: !isTop ? -8 : 'auto',
                      left: isLeft ? -8 : 'auto',
                      right: !isLeft ? -8 : 'auto',
                      width: '20px',
                      height: '20px',
                      backgroundColor: 'var(--accent)',
                      border: '2px solid #ffffff',
                      borderRadius: '4px',
                      cursor: `${handle}-resize`,
                      touchAction: 'none',
                      zIndex: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  />
                );
              })}

              {/* 상하좌우 변 핸들 (자유 비율일 때만) */}
              {aspectMode === 'free' &&
                ['n', 's', 'w', 'e'].map((handle) => {
                  const isHorizontal = handle === 'n' || handle === 's';
                  return (
                    <div
                      key={handle}
                      onPointerDown={(e) => handlePointerDown(handle, e)}
                      style={{
                        position: 'absolute',
                        top: handle === 'n' ? -4 : handle === 's' ? 'auto' : '50%',
                        bottom: handle === 's' ? -4 : 'auto',
                        left: handle === 'w' ? -4 : handle === 'e' ? 'auto' : '50%',
                        right: handle === 'e' ? -4 : 'auto',
                        transform: isHorizontal ? 'translateX(-50%)' : 'translateY(-50%)',
                        width: isHorizontal ? '32px' : '8px',
                        height: isHorizontal ? '8px' : '32px',
                        backgroundColor: 'var(--accent)',
                        opacity: 0.9,
                        borderRadius: '4px',
                        cursor: `${handle}-resize`,
                        touchAction: 'none',
                        zIndex: 9,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      }}
                    />
                  );
                })}
            </div>
          )}
        </div>

        {/* 하단 툴바 및 액션 버튼 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--code-bg)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              영역 초기화
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={processing}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
                fontSize: '15px',
                fontWeight: 600,
                cursor: processing ? 'not-allowed' : 'pointer',
                opacity: processing ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {processing ? '자르는 중...' : '✂️ 이 영역으로 선택 완료'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
