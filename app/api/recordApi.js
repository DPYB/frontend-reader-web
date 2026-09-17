/**
 * backend-record OCR API 클라이언트 (CLIAR-209 / CLIAR-228 / CLIAR-154).
 *
 * backend-record는 backend-auth 토큰을 그대로 검증하므로(내부적으로
 * GET /users/me 조회) authApi의 authFetch를 그대로 재사용해 Bearer 첨부와
 * 401 refresh 재시도 인프라를 공유한다.
 *
 * POST /api/v1/ocr/sentences는 이미지를 OCR로 인식하고 원본 이미지를 S3에
 * 업로드해 scrap_image_url을 생성한다. save_scrap 파라미터로 두 모드를 지원한다:
 *  - save_scrap=true : 인식 후 backend-book 스크랩까지 자동 저장(scrap_id 반환)
 *  - save_scrap=false: 인식과 S3 업로드만. 저장은 하지 않음(scrap_id=null).
 *                      사용자가 확인/수정 후 별도로 스크랩을 저장하는 흐름용(CLIAR-228).
 *
 * POST /api/v1/ocr/covers는 표지/바코드 사진에서 ISBN을 인식해 backend-book(알라딘 연동)이
 * 조회한 도서 메타데이터를 돌려준다. 책 등록 화면(RegisterBook)에서 쓴다.
 */

import { authFetch } from './authApi';
import { formatDuration } from '../lib/timeFormat';

/**
 * 문장 사진을 업로드해 OCR로 텍스트를 추출한다.
 *
 * 기본은 OCR-only 모드(saveScrap=false): 인식 결과와 S3에 저장된 원본 이미지 URL만
 * 돌려주고 backend-book 저장은 하지 않는다. 호출부가 결과를 사용자에게 보여주고
 * 확인/수정 후 bookApi.createScrap(scrapImageUrl 포함)으로 저장한다.
 *
 * @param {object} params
 * @param {File} params.imageFile - 촬영/선택한 이미지 파일 (image/jpeg 또는 image/png, 최대 50MB)
 * @param {number|string} params.bookId - 스크랩을 연결할 backend-book 서재 도서 ID
 * @param {number|string|null} [params.pageNumber] - 문장이 위치한 페이지 번호 (선택)
 * @param {string|null} [params.memo] - 스크랩에 남길 메모 (선택, save_scrap=true일 때만 의미)
 * @param {boolean} [params.saveScrap=false] - true면 서버가 backend-book에 자동 저장
 * @returns {Promise<{text: string, lines: string[], scrapImageUrl: string, scrapId: any}>}
 */
export async function createOcrSentence({
  imageFile,
  bookId,
  pageNumber = null,
  memo = null,
  saveScrap = false,
}) {
  const form = new FormData();
  form.append('image', imageFile);
  form.append('book_id', String(bookId));
  if (pageNumber !== null && pageNumber !== '') form.append('page_number', String(pageNumber));
  if (memo) form.append('memo', memo);

  const res = await authFetch(`/ocr/sentences?save_scrap=${saveScrap}`, {
    method: 'POST',
    body: form,
  });

  return {
    text: res.text,
    lines: res.lines,
    // OCR에 사용한 원본 이미지를 S3에 저장한 URL. 확인 후 저장 시 backend-book으로 전달한다.
    scrapImageUrl: res.scrap_image_url,
    scrapId: res.scrap_id ?? null,
  };
}

// ISBN-13 본체: 978/979 접두사 + 10자리. 바코드 옆 부가기호(03330 등)나
// 정가 표기가 같은 줄에 섞여 들어와도 이 패턴만 뽑아낸다.
const ISBN13_RE = /97[89]\d{10}/;

/**
 * OCR로 인식된 줄 목록에서 ISBN-13을 찾는다.
 *
 * backend-record도 같은 일을 하지만(app/services/bedrock_ocr.py `_extract_isbn`),
 * 줄에서 숫자만 남긴 뒤 '앞 13자리'만 검사해서 ISBN 앞에 다른 숫자가 붙은 줄
 * (예: '값 15,000원 ISBN 978-89-349-3960-3')을 놓친다. OCR 결과의 줄 분할은
 * 실행마다 달라지므로, 응답의 isbn이 비어 있을 때 여기서 한 번 더 찾는다.
 *
 * @param {string[]} lines
 * @returns {string|null}
 */
function findIsbnInLines(lines) {
  for (const line of lines) {
    const digits = String(line).replace(/\D/g, '');
    const matched = digits.match(ISBN13_RE);
    if (matched) return matched[0];
  }
  return null;
}

/**
 * 표지/바코드 사진을 업로드해 ISBN과 제목·저자 후보를 인식한다 (CLIAR-154 후속).
 *
 * POST /api/v1/ocr/covers (backend-record app/api/ocr.py)
 *  - multipart/form-data, 이미지 필드명은 /ocr/sentences와 동일한 image
 *  - 응답: { title_candidate, author_candidates[], lines[], request_id, confidence,
 *           isbn, book_id, already_registered, book }
 *
 * 주의: 이 엔드포인트는 인식한 ISBN으로 backend-book을 조회한 뒤 사용자의 서재에
 * 책까지 등록하고 book_id를 돌려준다. 이미 서재에 있으면 already_registered=true와
 * 기존 book_id를 준다. 따라서 등록 화면은 이 book_id를 이어받아 새로 만들지 말고
 * 갱신해야 중복 등록이 생기지 않는다.
 *
 * @param {object} params
 * @param {File} params.imageFile - 촬영/선택한 이미지 파일 (image/jpeg 또는 image/png, 최대 50MB)
 * @param {string|null} [params.modelId] - 사용할 Bedrock 모델 ID (미지정 시 서버 설정값)
 * @returns {Promise<{isbn: string|null, titleCandidate: string, authorCandidates: string[],
 *   lines: string[], bookId: any, alreadyRegistered: boolean, book: object|null,
 *   requestId: string|null, raw: any}>}
 */
export async function createOcrCover({ imageFile, modelId = null }) {
  const form = new FormData();
  form.append('image', imageFile);

  const query = modelId ? `?model_id=${encodeURIComponent(modelId)}` : '';
  const res = await authFetch(`/ocr/covers${query}`, { method: 'POST', body: form });

  const lines = res.lines ?? [];

  return {
    // 하이픈·공백이 제거된 숫자 문자열. 서버가 못 찾았으면 인식된 줄에서 직접 찾는다.
    isbn: res.isbn ?? findIsbnInLines(lines),
    titleCandidate: res.title_candidate ?? '',
    authorCandidates: res.author_candidates ?? [],
    lines,
    bookId: res.book_id ?? null,
    alreadyRegistered: Boolean(res.already_registered),
    // backend-book /search 결과(서재 도서 또는 알라딘 조회 결과). 못 찾으면 null.
    book: res.book ?? null,
    requestId: res.request_id ?? null,
    // 응답 형식이 예상과 다를 때 원인을 파악하기 위한 원본 응답.
    raw: res,
  };
}

/**
 * 독서 기록(감상문) 작성 API 호출 (POST /api/v1/records).
 *
 * @param {object} params
 * @param {number|string} params.bookId - 대상 서재 도서 ID
 * @param {string} params.content - 감상문 본문 내용
 * @param {string|null} [params.weather=null] - 날씨 조건 ('clear', 'rainy', 'cloudy' 등, 미허용 시 null)
 * @param {number|null} [params.rating=null] - 평점 (1~5)
 * @param {string|null} [params.title=null] - 감상문 제목 (선택)
 * @returns {Promise<object>} 생성된 독서 기록 응답
 */
export async function createReadingRecord({
  bookId,
  content,
  weather = null,
  rating = null,
  title = null,
}) {
  return authFetch('/records', {
    method: 'POST',
    body: {
      book_id: bookId,
      content,
      weather: weather || null,
      rating,
      title,
    },
  });
}

/**
 * 특정 도서의 독서 세션(타이머 독서 기록)을 백엔드에 저장합니다.
 * 백엔드 정밀도 패치(PR #13)에 따라 60초 미만도 duration_seconds(초 단위)와 duration_minutes=0으로 정확히 보존합니다.
 * 404 등 미지원 환경인 경우 기존 POST /api/v1/records 로 자동 폴백하여 안전하게 저장합니다.
 *
 * @param {object} params
 * @param {number|string} params.bookId - 대상 서재 도서 ID
 * @param {number} params.duration - 읽은 시간 (초 단위)
 * @param {number|string|null} [params.pageNumber=null] - 현재 도달 페이지
 * @param {string|null} [params.memo=null] - 독서 메모 또는 한 줄 감상
 * @param {string|null} [params.weather=null] - 날씨 조건
 * @returns {Promise<object>} 생성된 독서 세션 응답
 */
export async function createReadingSession({
  bookId,
  duration,
  pageNumber = null,
  memo = null,
  weather = null,
}) {
  const durationSeconds = Math.max(0, Math.round(Number(duration) || 0));
  const durationMinutes = Math.floor(durationSeconds / 60);
  const formattedTime = formatDuration(durationSeconds);
  const cleanMemo = memo?.trim() || `⏱️ ${formattedTime} 독서 세션`;

  try {
    return await authFetch(`/books/${encodeURIComponent(bookId)}/reading-sessions`, {
      method: 'POST',
      body: {
        duration: durationSeconds,
        duration_seconds: durationSeconds,
        durationSeconds,
        duration_minutes: durationMinutes,
        durationMinutes,
        page_number: pageNumber ? Number(pageNumber) : null,
        memo: cleanMemo,
        weather: weather || null,
      },
    });
  } catch {
    // 신규 엔드포인트 미배포(404) 시 기존 records API로 fallback 저장
    return createReadingRecord({
      bookId,
      content: cleanMemo,
      weather: weather || null,
      title: `${formattedTime} 독서 세션`,
    });
  }
}

/**
 * 특정 도서의 독서 기록(감상문) 목록 조회 (GET /api/v1/records?book_id=...).
 *
 * @param {number|string} bookId
 * @returns {Promise<Array>} 독서 기록 목록
 */
export async function fetchReadingRecords(bookId) {
  const query = bookId ? `?book_id=${encodeURIComponent(bookId)}` : '';
  return authFetch(`/records${query}`);
}

/**
 * 특정 도서의 독서 세션(타이머 독서 기록) 목록 조회.
 *
 * 1차: GET /api/v1/books/{bookId}/reading-sessions
 * 폴백: GET /api/v1/records?book_id=...
 *
 * @param {number|string} bookId
 * @returns {Promise<Array>} 독서 세션 목록
 */
export async function fetchReadingSessions(bookId) {
  if (!bookId) return [];
  try {
    const res = await authFetch(`/books/${encodeURIComponent(bookId)}/reading-sessions`);
    const rawList = Array.isArray(res)
      ? res
      : Array.isArray(res?.sessions)
        ? res.sessions
        : Array.isArray(res?.items)
          ? res.items
          : null;

    if (rawList) {
      return rawList.map((s) => {
        const sec = s.duration_seconds ?? s.durationSeconds ?? (typeof s.duration === 'number' ? s.duration : null);
        const mins = s.duration_minutes ?? s.durationMinutes ?? (sec != null ? Math.floor(sec / 60) : 0);
        return {
          id: s.id || s.sessionId || s.session_id,
          bookId: s.bookId || s.book_id || bookId,
          duration: sec ?? (mins * 60),
          durationSeconds: sec,
          durationMinutes: mins,
          memo: s.memo || s.content || '',
          pageNumber: s.pageNumber ?? s.page_number ?? null,
          weather: s.weather || null,
          createdAt: s.createdAt || s.created_at || new Date().toISOString(),
        };
      });
    }
  } catch {
    // 세션 엔드포인트가 없으면 records에서 조회
  }

  try {
    const records = await fetchReadingRecords(bookId);
    if (Array.isArray(records)) {
      return records.map((r) => {
        // 기존 records 모델을 세션 규격으로 정규화
        const secMatch = r.title?.match(/(\d+)초/);
        const minMatch = r.title?.match(/(\d+)분/);
        let inferredSec = 600;
        let inferredMin = 10;
        if (secMatch) {
          inferredSec = Number(secMatch[1]);
          inferredMin = 0;
        } else if (minMatch) {
          inferredMin = Number(minMatch[1]);
          inferredSec = inferredMin * 60;
        }
        const finalSec = r.durationSeconds ?? r.duration ?? inferredSec;
        const finalMin = r.durationMinutes ?? inferredMin;
        return {
          id: r.id || r.recordId || r.record_id,
          bookId: r.bookId || r.book_id || bookId,
          duration: finalSec,
          durationSeconds: finalSec,
          durationMinutes: finalMin,
          memo: r.content || r.memo || '',
          pageNumber: r.pageNumber || r.page_number || null,
          weather: r.weather || null,
          createdAt: r.createdAt || r.created_at || new Date().toISOString(),
        };
      });
    }
  } catch {
    // records도 실패하면 빈 배열 반환
  }
  return [];
}


