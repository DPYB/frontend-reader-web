import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** 마지막으로 사용한 렌즈 방향을 기억해 다음 촬영에서도 그대로 열어주기 위한 저장 키 */
const FACING_STORAGE_KEY = 'dpyb.camera.facing';

/**
 * 처음 열 때 사용할 렌즈 방향.
 * 1) 사용자가 전환해 둔 값이 있으면 그 값을 우선 사용
 * 2) 없으면 터치 기기(모바일/태블릿)는 책을 찍기 편한 후면(environment),
 *    데스크톱은 노트북 웹캠(user)으로 시작한다.
 */
function getInitialFacing() {
  try {
    const saved = localStorage.getItem(FACING_STORAGE_KEY);
    if (saved === 'user' || saved === 'environment') return saved;
  } catch {
    // localStorage 접근 불가(시크릿 모드 등)면 기기 기준 기본값으로 진행
  }
  const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches;
  return isTouchDevice ? 'environment' : 'user';
}

/**
 * WebcamCaptureModal — getUserMedia로 노트북/PC 웹캠 스트림을 띄우고
 * 셔터 버튼으로 정지 프레임을 캡처하는 모달 (CLIAR-210).
 *
 * `<input type="file" capture>`는 모바일에서는 OS 카메라 앱을 열어주지만
 * 데스크톱 브라우저에서는 무시되고 파일 탐색기만 뜬다. 이 모달은 그 공백을
 * 메워 데스크톱에서도 웹캠으로 즉석 촬영할 수 있게 한다(모바일은 기존
 * capture 입력을 그대로 사용하므로 이 컴포넌트와는 독립적인 대안 경로다).
 *
 * 카메라가 2대 이상인 기기(스마트폰 전/후면 등)에서는 렌즈 전환 버튼을 보여주고,
 * `guideFrame`이 켜져 있으면 ISBN 숫자를 맞추기 위한 가로형 프레임을 기본으로 띄우되
 * 버튼으로 끄고 켤 수 있다(프레임 없이도 촬영 가능). 프레임은 정렬용 가이드일 뿐
 * 캡처 결과는 항상 카메라 전체 화면이다.
 *
 * @param {(file: File) => void} onCapture - 캡처된 이미지를 File(image/jpeg)로 전달
 * @param {() => void} onClose - 닫기 콜백
 * @param {boolean} [guideFrame=false] - ISBN 촬영용 가로형 프레임 가이드 사용 여부
 */
export default function WebcamCaptureModal({ onCapture, onClose, guideFrame = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  // 요청한 렌즈 방향 / 실제로 열린 렌즈 방향(미리보기 좌우반전 판단용)
  const [facing, setFacing] = useState(getInitialFacing);
  const [activeFacing, setActiveFacing] = useState(facing);
  // 렌즈 전환 버튼은 카메라가 2대 이상일 때만 노출
  const [canSwitch, setCanSwitch] = useState(false);
  const [frameOn, setFrameOn] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('이 브라우저에서는 웹캠 기능을 지원하지 않아요.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        // 데스크톱 웹캠은 facingMode를 보고하지 않으므로 요청값으로 대체
        const settings = stream.getVideoTracks()[0]?.getSettings?.() ?? {};
        setActiveFacing(settings.facingMode || facing);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);

        // 권한 허용 후에야 카메라 목록이 정확히 조회된다
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled) {
            setCanSwitch(devices.filter((d) => d.kind === 'videoinput').length > 1);
          }
        } catch {
          // 목록 조회 실패 시 전환 버튼만 숨기고 촬영은 그대로 진행
        }
      } catch (err) {
        if (cancelled) return;
        // 권한 거부/카메라 없음 등을 구분해 안내
        if (err?.name === 'NotAllowedError') {
          setError('카메라 권한이 거부됐어요. 브라우저 주소창의 카메라 권한을 허용해 주세요.');
        } else if (err?.name === 'NotFoundError') {
          setError('연결된 카메라를 찾을 수 없어요.');
        } else {
          setError('카메라를 여는 중 문제가 발생했어요.');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  const handleClose = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onClose();
  }, [onClose]);

  // 전/후면 렌즈 전환: 기존 스트림을 끄고 반대 방향으로 다시 연다 (facing 변경 → effect 재실행)
  const handleSwitchFacing = useCallback(() => {
    const next = facing === 'user' ? 'environment' : 'user';
    try {
      localStorage.setItem(FACING_STORAGE_KEY, next);
    } catch {
      // 저장 실패는 무시 (이번 세션에서만 적용)
    }
    setReady(false);
    setError('');
    setFacing(next);
  }, [facing]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !ready) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onCapture(file);
      },
      'image/jpeg',
      0.92
    );
  }, [ready, onCapture]);

  // 프리뷰 위에 얹는 작은 알약형 컨트롤 버튼 공통 스타일
  const overlayBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', minHeight: 36, borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.55)',
    color: '#fff', fontSize: 15, cursor: 'pointer', backdropFilter: 'blur(4px)',
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 92vw)', background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', color: 'var(--text-h)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>📷 사진 촬영</h3>
          <button
            onClick={handleClose}
            style={{ border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 22 }}
          >
            ✕
          </button>
        </div>

        {error ? (
          <p style={{ fontSize: 17, color: '#e05a4e', textAlign: 'center', padding: '32px 0' }}>{error}</p>
        ) : (
          <div
            style={{
              width: '100%', aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden',
              background: '#000', position: 'relative',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                // 전면(셀피) 카메라일 때만 거울처럼 좌우반전해 보여준다 (캡처 결과는 반전되지 않음)
                transform: activeFacing === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />

            {/* ISBN 촬영용 가로형 프레임 가이드: 바깥 영역을 어둡게 처리해 숫자 위치를 맞추기 쉽게 한다 */}
            {guideFrame && frameOn && ready && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '88%', aspectRatio: '16 / 5', borderRadius: 10,
                    border: '2px solid var(--accent)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 10, textAlign: 'center',
                    color: '#fff', fontSize: 15, textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  }}
                >
                  ISBN 숫자를 프레임 안에 가로로 맞춰 주세요
                </span>
              </div>
            )}

            {/* 프리뷰 우상단 컨트롤: 프레임 켜기/끄기, 렌즈 전환 */}
            <div
              style={{
                position: 'absolute', top: 10, right: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
              }}
            >
              {guideFrame && (
                <button
                  type="button"
                  onClick={() => setFrameOn((v) => !v)}
                  aria-pressed={frameOn}
                  aria-label={frameOn ? '촬영 프레임 끄기' : '촬영 프레임 켜기'}
                  style={{
                    ...overlayBtnStyle,
                    ...(frameOn ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}),
                  }}
                >
                  ▭ 프레임 {frameOn ? 'ON' : 'OFF'}
                </button>
              )}
              {canSwitch && (
                <button
                  type="button"
                  onClick={handleSwitchFacing}
                  aria-label="카메라 렌즈 방향 전환"
                  style={overlayBtnStyle}
                >
                  🔄 {facing === 'user' ? '후면으로' : '전면으로'}
                </button>
              )}
            </div>

            {!ready && (
              <span
                style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 17, background: 'rgba(0,0,0,0.6)',
                }}
              >
                카메라를 여는 중이에요...
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={handleCapture}
            disabled={!ready || !!error}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
              background: ready && !error ? 'var(--accent)' : 'var(--border)',
              color: ready && !error ? '#fff' : 'var(--text)',
              fontWeight: 700, cursor: ready && !error ? 'pointer' : 'not-allowed', fontSize: 18,
            }}
          >
            📸 촬영
          </button>
          <button
            type="button"
            onClick={handleClose}
            style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-h)', cursor: 'pointer', fontSize: 18 }}
          >
            취소
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
