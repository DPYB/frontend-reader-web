import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBooks } from '../store/booksStore';
import { useLibrarian } from '../store/librarianStore';
import { getColorPresets, extractDominantColorIndex, loadImage } from '../features/register/ocrUtils';
import { GENRE_DEFS, GENRE_CODES, GENRE_NONE, genreLabel, genreCode, detectGenreCode } from '../data/genres';
import { classifyGenre } from '../api/genreApi';
import { createOcrCover } from '../api/recordApi';
import { searchBookByIsbn, searchBooksByKeyword, toReadingStatus } from '../api/bookApi';
import { setVisual } from '../store/bookVisuals';
import { ApiError } from '../api/authApi';
import { getBookThickness } from '../features/room/bookExtractor';
import { coverImageSrc, onFallbackCover } from '../lib/coverImage';
import LoadingSequence from '../components/LoadingSequence';
import WebcamCaptureModal from '../features/room/WebcamCaptureModal';
import './RegisterBook.css';

/**
 * 표지 OCR(ISBN 인식) 실패 원인을 사용자에게 구체적으로 안내한다.
 */
function describeCoverOcrError(err) {
  if (err instanceof ApiError) {
    if (err.status === 422) return 'ISBN을 찾지 못했어요. 바코드 아래 13자리 숫자가 선명하게 보이도록 다시 찍어 주세요.';
    if (err.status === 404) return '해당 ISBN의 도서 정보를 찾지 못했어요. 아래에서 직접 입력해 주세요.';
    if (err.status === 400) return '인식한 ISBN이 올바르지 않아요. 바코드가 잘리지 않게 다시 찍어 주세요.';
    if (err.status === 413) return '이미지가 너무 커요. 더 작은 사진으로 다시 시도해 주세요.';
    if (err.status === 415) return '지원하지 않는 이미지 형식이에요. JPG 또는 PNG로 올려 주세요.';
    if (err.status === 504) return '인식이 오래 걸려 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.';
    if (err.status === 502) return '도서 조회 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.';
    if (err.status === 401) return '로그인이 만료됐어요. 다시 로그인해 주세요.';
    return err.message || 'ISBN 인식 중 문제가 발생했어요.';
  }
  return '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.';
}

// 페이지 진행 상황으로 진행 상태 자동 계산
function deriveStatus(currentPage, totalPage) {
  const cur = Number(currentPage) || 0;
  const total = Number(totalPage) || 0;
  if (total > 0 && cur >= total) return '완독';
  if (cur > 0) return '읽는중';
  return '시작전';
}

/**
 * 장르 메인 라벨 및 세부 분류/보조 라벨을 조합하여 반환.
 */
function getGenreSubLabel(genreCode, subject = '', displayGenre = '') {
  const mainLabel = genreLabel(genreCode);
  if (!mainLabel) return '미지정';

  if (displayGenre && displayGenre.trim()) {
    const trimmed = displayGenre.trim();
    if (trimmed.includes('(') || trimmed.startsWith(mainLabel)) {
      return trimmed;
    }
    return `${mainLabel} (${trimmed})`;
  }

  if (subject && subject.trim() && subject.trim() !== mainLabel) {
    return `${mainLabel} (${subject.trim()})`;
  }

  return mainLabel;
}

// 서재 선반 최대 권수
const MAX_LIBRARY_BOOKS = 50;

// 추천 검색어 태그 목록
const POPULAR_SEARCH_KEYWORDS = ['불편한 편의점', '소년이 온다', '세이노의 가르침', '마흔에 읽는 쇼펜하우어', '트렌드 코리아', '모순'];

export default function RegisterBook() {
  const { books, addBook, saveReadingProgress, saveBookMeta, reload } = useBooks();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeId: librarianId } = useLibrarian();
  const presets = useMemo(() => getColorPresets(librarianId), [librarianId]);

  const uploadInputRef = useRef(null);
  const formSectionRef = useRef(null);
  const runIdRef = useRef(0);
  const previewUrlRef = useRef(null);
  const searchTimerRef = useRef(null);

  // 등록 모드: 'search'(키워드 검색) | 'camera'(사진/바코드 촬영) | 'manual'(직접 입력)
  const [activeTab, setActiveTab] = useState('search');

  // ── 도서 키워드 검색 상태 ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchMeta, setSearchMeta] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [instantRegisteringKey, setInstantRegisteringKey] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // ── 카메라/바코드 모달 및 OCR 상태 ──
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const MAX_IMAGE_SIZE_MB = 5;
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

  const [previewUrl, setPreviewUrl] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocrNotice, setOcrNotice] = useState('');
  const [editing, setEditing] = useState(true);
  const [fromRecommendation, setFromRecommendation] = useState(false);

  // ── 도서 상세 폼 상태 ──
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [genre, setGenre] = useState(GENRE_NONE);
  const [genreLoading, setGenreLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [displayGenre, setDisplayGenre] = useState('');

  const [isbn, setIsbn] = useState('');
  const [isbnSearching, setIsbnSearching] = useState(false);
  const [ocrBookId, setOcrBookId] = useState(null);
  const [extraMeta, setExtraMeta] = useState({
    publisher: null,
    publishedDate: null,
    coverUrl: null,
    sideCoverUrl: null,
    description: null,
    genreSource: 'KDC',
  });

  const [totalPage, setTotalPage] = useState('');
  const [currentPage, setCurrentPage] = useState('0');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isLibraryFull = !ocrBookId && books.length >= MAX_LIBRARY_BOOKS;

  /**
   * 장르 자동 분류
   */
  const autoClassifyGenre = useCallback(async ({ title: t, author: a, isbn = '', rawCategory = '' }) => {
    if (!t?.trim()) return;
    setGenreLoading(true);
    try {
      const result = await classifyGenre({ title: t, author: a, isbn, rawCategory });
      if (result?.genre) setGenre(result.genre);
      if (result?.subject) setSubject(result.subject);
      if (result?.displayGenre) setDisplayGenre(result.displayGenre);
    } finally {
      setGenreLoading(false);
    }
  }, []);

  // AI 추천 등 외부 state로 넘어온 도서 정보 처리
  useEffect(() => {
    if (location.state?.book) {
      const { book } = location.state;
      setActiveTab('manual');
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setColorIdx(book.colorIdx ?? 0);
      setIsbn(book.isbn || '');
      setSubject(book.subject || '');
      setDisplayGenre(book.displayGenre || book.display_genre || '');
      setExtraMeta({
        publisher: book.publisher ?? null,
        publishedDate: book.publishedDate ?? null,
        coverUrl: book.coverUrl ?? book.cover_url ?? null,
        sideCoverUrl: book.sideCoverUrl ?? book.side_cover_url ?? null,
        description: book.description ?? null,
        genreSource: book.genreSource || book.genre_source || 'KDC',
      });
      const parsedTotalPage =
        book.page_count != null
          ? book.page_count
          : book.totalPage != null
            ? book.totalPage
            : '';
      setTotalPage(parsedTotalPage !== '' && parsedTotalPage !== null ? String(parsedTotalPage) : '');
      setCurrentPage(String(book.currentPage !== undefined && book.currentPage !== null ? book.currentPage : 0));
      setOcrDone(true);
      setEditing(true);
      setFromRecommendation(true);

      if (book.genre) {
        const upper = typeof book.genre === 'string' ? book.genre.trim().toUpperCase() : '';
        const normalizedGenre = GENRE_CODES.includes(upper)
          ? upper
          : genreCode(book.genre) || detectGenreCode(book.genre) || book.genre;
        setGenre(normalizedGenre);
      } else {
        autoClassifyGenre({ title: book.title, author: book.author, isbn: book.isbn || '' });
      }
    }
  }, [location.state, autoClassifyGenre]);

  // ── 도서 키워드 검색 실행 함수 ──
  const executeSearch = useCallback(async (queryText) => {
    const trimmed = (queryText || '').trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchMeta(null);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const data = await searchBooksByKeyword({ query: trimmed, limit: 10 });
      setSearchResults(data.items || []);
      setSearchMeta({
        query: data.query,
        total: data.total,
        alreadyRegistered: data.alreadyRegistered,
      });
    } catch (err) {
      console.error('[RegisterBook] 검색 오류:', err);
      setSearchError('도서 검색 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 검색어 입력 시 350ms 디바운스 적용
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchMeta(null);
      setHasSearched(false);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      executeSearch(trimmed);
    }, 350);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, executeSearch]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    executeSearch(searchQuery);
  };

  const handleSelectKeywordChip = (chip) => {
    setSearchQuery(chip);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    executeSearch(chip);
  };

  // ── 1. 원스톱 즉시 서재 등록 (원클릭) ──
  const handleInstantRegister = async (item) => {
    if (isLibraryFull) {
      setSubmitError(`서재가 가득 찼어요. 최대 ${MAX_LIBRARY_BOOKS}권까지 등록할 수 있어요.`);
      return;
    }
    const key = item.isbn || item.title;
    setInstantRegisteringKey(key);
    setSubmitError(null);

    const safeTotalPages = Number(item.totalPages) > 0 ? Math.floor(Number(item.totalPages)) : null;
    const thickness = getBookThickness(safeTotalPages);
    const color = presets[0];

    try {
      await addBook({
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        publisher: item.publisher,
        publishedDate: item.publishedDate,
        coverUrl: item.coverUrl,
        totalPages: safeTotalPages,
        currentPage: 0,
        status: '시작전',
        colorIdx: 0,
        spineColor: color.spine,
        coverColor: color.cover,
        thickness,
        genre: 'NONE',
        description: item.description,
        genreSource: item.genreSource || 'KDC',
      });

      // 등록 성공 피드백 및 서재로 이동
      setToastMessage(`🎉 '${item.title}' 도서가 내 서재에 꽂혔습니다!`);
      setTimeout(() => {
        navigate('/library');
      }, 700);
    } catch (err) {
      console.error('[RegisterBook] 원스톱 등록 실패:', err);
      let message = '도서 등록 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
      if (err?.status === 409) {
        message = '이미 서재에 등록된 책이에요.';
      } else if (err?.status === 422) {
        message = '도서 정보 형식에 오류가 있어요.';
      } else if (err?.data?.detail && typeof err.data.detail === 'string') {
        message = err.data.detail;
      }
      setSubmitError(message);
    } finally {
      setInstantRegisteringKey(null);
    }
  };

  // ── 2. 상세 정보 확인 후 등록 (폼에 복사) ──
  const handleSelectBookForDetail = (item) => {
    setTitle(item.title || '');
    setAuthor(item.author || '');
    setIsbn(item.isbn || '');
    setTotalPage(item.totalPages ? String(item.totalPages) : '');
    setCurrentPage('0');
    setColorIdx(0);
    setExtraMeta({
      publisher: item.publisher ?? null,
      publishedDate: item.publishedDate ?? null,
      coverUrl: item.coverUrl ?? null,
      sideCoverUrl: item.sideCoverUrl ?? null,
      description: item.description ?? null,
      genreSource: item.genreSource || 'KDC',
    });
    setOcrDone(true);
    setEditing(true);
    setFromRecommendation(false);

    autoClassifyGenre({ title: item.title, author: item.author, isbn: item.isbn || '' });

    // 폼 영역으로 자연스럽게 스크롤
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  /**
   * 사진 업로드 / 촬영 처리
   */
  async function handleFile(file) {
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setOcrError(`이미지가 너무 커요. ${MAX_IMAGE_SIZE_MB}MB 이하의 사진으로 다시 시도해 주세요.`);
      return;
    }

    const runId = ++runIdRef.current;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(previewUrlRef.current);
    setOcrLoading(true);
    setOcrDone(false);
    setEditing(false);
    setOcrError('');
    setOcrNotice('');
    setTitle('');
    setAuthor('');
    setGenre(GENRE_NONE);
    setSubject('');
    setDisplayGenre('');
    setTotalPage('');
    setIsbn('');
    setOcrBookId(null);
    setExtraMeta({ publisher: null, publishedDate: null, coverUrl: null, sideCoverUrl: null, description: null, genreSource: 'KDC' });
    setFromRecommendation(false);

    loadImage(previewUrlRef.current)
      .then((img) => extractDominantColorIndex(img, presets))
      .then((idx) => {
        if (runIdRef.current === runId) setColorIdx(idx);
      })
      .catch(() => {
        if (runIdRef.current === runId) setColorIdx(0);
      });

    try {
      const cover = await createOcrCover(file);
      if (runIdRef.current !== runId) return;

      if (cover.isbn) {
        setIsbn(cover.isbn);
        let found = cover.book;

        if (!found) {
          const searched = await searchBookByIsbn(cover.isbn);
          found = searched.book;
          if (searched.bookId) setOcrBookId(searched.bookId);
          if (searched.alreadyRegistered) {
            setOcrNotice('이미 서재에 등록된 도서입니다. 정보를 수정하여 저장할 수 있습니다.');
          }
        } else if (cover.alreadyRegistered) {
          setOcrNotice('이미 서재에 등록된 도서입니다. 정보를 수정하여 저장할 수 있습니다.');
        }

        if (found) {
          setTitle(found.title || '');
          setAuthor(found.author || '');
          setTotalPage(found.totalPages ? String(found.totalPages) : '');
          setExtraMeta({
            publisher: found.publisher ?? null,
            publishedDate: found.publishedDate ?? null,
            coverUrl: found.coverUrl ?? null,
            sideCoverUrl: found.sideCoverUrl ?? null,
            description: found.description ?? null,
            genreSource: found.genreSource || 'KDC',
          });
          if (found.genre) {
            setGenre(found.genre);
            if (found.subject) setSubject(found.subject);
            if (found.displayGenre) setDisplayGenre(found.displayGenre);
          } else {
            autoClassifyGenre({ title: found.title, author: found.author, isbn: cover.isbn, rawCategory: cover.raw?.category_name });
          }
          setOcrDone(true);
          return;
        }
      }

      if (cover.raw?.candidates?.length) {
        const first = cover.raw.candidates[0];
        setTitle(first.title || '');
        setAuthor(first.author || '');
        autoClassifyGenre({ title: first.title, author: first.author, isbn: cover.isbn || '' });
        setOcrNotice('도서 메타데이터를 찾지 못해 OCR 텍스트로 채웠습니다. 내용을 확인해 주세요.');
        setOcrDone(true);
        setEditing(true);
        return;
      }

      setOcrNotice('인식된 정보가 없습니다. 제목과 저자를 직접 입력해 주세요.');
      setOcrDone(true);
      setEditing(true);
    } catch (err) {
      if (runIdRef.current !== runId) return;
      setOcrError(describeCoverOcrError(err));
      setOcrDone(true);
      setEditing(true);
    } finally {
      if (runIdRef.current === runId) setOcrLoading(false);
    }
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function handleWebcamCapture(file) {
    setWebcamOpen(false);
    handleFile(file);
  }

  /**
   * ISBN 직접 검색
   */
  const handleSearchIsbn = useCallback(async () => {
    const cleanIsbn = (isbn || '').replace(/[^0-9X]/gi, '').trim();
    if (!cleanIsbn || (cleanIsbn.length !== 10 && cleanIsbn.length !== 13)) {
      setOcrError('올바른 10자리 또는 13자리 ISBN을 입력해주세요.');
      return;
    }
    setIsbnSearching(true);
    setOcrError('');
    setOcrNotice('');
    try {
      const searched = await searchBookByIsbn(cleanIsbn);
      const found = searched.book;
      if (searched.alreadyRegistered) {
        setOcrNotice('이미 서재에 등록된 도서입니다. 정보를 수정하여 저장할 수 있습니다.');
      }
      if (searched.bookId) {
        setOcrBookId(searched.bookId);
      }
      if (found) {
        setTitle(found.title || '');
        setAuthor(found.author || '');
        setTotalPage(found.totalPages ? String(found.totalPages) : '');
        setExtraMeta({
          publisher: found.publisher ?? null,
          publishedDate: found.publishedDate ?? null,
          coverUrl: found.coverUrl ?? null,
          sideCoverUrl: found.sideCoverUrl ?? null,
          description: found.description ?? null,
          genreSource: found.genreSource || 'KDC',
        });
        if (found.genre) {
          setGenre(found.genre);
          if (found.subject) setSubject(found.subject);
          if (found.displayGenre) setDisplayGenre(found.displayGenre);
        } else {
          autoClassifyGenre({ title: found.title, author: found.author, isbn: cleanIsbn });
        }
        setOcrDone(true);
      } else {
        setOcrNotice('국립중앙도서관에서 도서 정보를 찾지 못했습니다. 제목과 저자를 직접 입력해주세요.');
        setOcrDone(true);
        setEditing(true);
      }
    } catch (err) {
      console.error('[RegisterBook] ISBN 검색 실패:', err);
      setOcrError('도서 정보 조회에 실패했습니다. 다시 시도하거나 직접 입력해주세요.');
    } finally {
      setIsbnSearching(false);
    }
  }, [isbn, autoClassifyGenre]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const thickness = getBookThickness(Number(totalPage) || null);

  const allFilled =
    title.trim() &&
    author.trim() &&
    colorIdx !== null &&
    String(totalPage).trim() !== '' &&
    Number(totalPage) > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allFilled || submitting || isLibraryFull) return;
    const color = presets[colorIdx];
    const initialPage = Number(currentPage) > 0 ? Math.floor(Number(currentPage)) : 0;
    const safeTotalPage = Number(totalPage) > 0 ? Math.floor(Number(totalPage)) : null;
    const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '').slice(0, 13) : null;
    const cleanAuthor = author.trim().slice(0, 100);
    const cleanTitle = title.trim().slice(0, 200);

    setSubmitting(true);
    setSubmitError(null);
    const readingStatus = toReadingStatus(deriveStatus(initialPage, safeTotalPage));

    try {
      let bookId = ocrBookId;

      if (bookId) {
        await saveBookMeta(bookId, {
          title: cleanTitle,
          author: cleanAuthor,
          isbn: cleanIsbn,
          genre,
          subject: subject || null,
          displayGenre: displayGenre || null,
          publisher: extraMeta.publisher,
          publishedDate: extraMeta.publishedDate,
          coverUrl: extraMeta.coverUrl,
          description: extraMeta.description,
          genreSource: extraMeta.genreSource || 'KDC',
          totalPages: safeTotalPage,
          readingStatus,
        });
        setVisual(bookId, { colorIdx, spineColor: color.spine, coverColor: color.cover, thickness });
        await reload();
      } else {
        const created = await addBook({
          title: cleanTitle,
          author: cleanAuthor,
          isbn: cleanIsbn,
          publisher: extraMeta.publisher,
          publishedDate: extraMeta.publishedDate,
          coverUrl: extraMeta.coverUrl,
          colorIdx,
          spineColor: color.spine,
          coverColor: color.cover,
          thickness,
          totalPage: safeTotalPage,
          status: deriveStatus(initialPage, safeTotalPage),
          genre,
          subject: subject || null,
          displayGenre: displayGenre || null,
          description: extraMeta.description,
          genreSource: extraMeta.genreSource || 'KDC',
        });
        bookId = created?.bookId ?? null;
      }

      if (bookId && initialPage > 0) {
        try {
          await saveReadingProgress(bookId, initialPage, safeTotalPage);
        } catch {
          // 무시
        }
      }
      navigate('/library');
    } catch (err) {
      console.error('[RegisterBook] 도서 등록 실패:', err);
      let message = '책 등록 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
      if (err?.status === 409) {
        message = '이미 서재에 등록된 책이에요.';
      } else if (err?.status === 422) {
        message = '도서 정보 형식에 오류가 있어요. (발행일자 또는 총 페이지 수를 확인해 주세요)';
      } else if (err?.data?.detail && typeof err.data.detail === 'string') {
        message = err.data.detail;
      } else if (err?.message && typeof err.message === 'string' && !err.message.includes('object')) {
        message = err.message;
      }
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle = { padding: 8, fontSize: 18, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' };
  const compactFieldStyle = { ...fieldStyle, padding: '6px 10px', fontSize: 16 };
  const compactViewStyle = { fontSize: 17, color: 'var(--text-h)', lineHeight: 1.4, wordBreak: 'break-word' };

  return (
    <div className="rb-container">
      {toastMessage && (
        <div className="rb-success-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      <h2 className="rb-title">책 등록</h2>

      {fromRecommendation && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--accent-bg, rgba(0, 229, 255, 0.1))',
            border: '1px solid var(--accent-border, var(--accent))',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 20,
            fontSize: 16,
            color: 'var(--text-h)',
          }}
        >
          <span>✨ <strong>AI 사서 추천 도서</strong> 정보가 자동으로 입력되었습니다. (필요 시 수정 가능)</span>
          <button
            type="button"
            onClick={() => setFromRecommendation(false)}
            style={{ border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 17 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 등록 방식 탭 선택 ── */}
      <div className="rb-mode-tabs" role="tablist">
        <button
          type="button"
          className={`rb-mode-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          role="tab"
          aria-selected={activeTab === 'search'}
        >
          🔍 도서 검색
        </button>
        <button
          type="button"
          className={`rb-mode-tab ${activeTab === 'camera' ? 'active' : ''}`}
          onClick={() => setActiveTab('camera')}
          role="tab"
          aria-selected={activeTab === 'camera'}
        >
          📷 사진·ISBN 바코드
        </button>
        <button
          type="button"
          className={`rb-mode-tab ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('manual');
            setOcrDone(true);
            setEditing(true);
          }}
          role="tab"
          aria-selected={activeTab === 'manual'}
        >
          ✍️ 직접 입력
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. 키워드 검색 모드 (YES24 기반 검색 + 원스톱 서재 등록)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'search' && (
        <div className="rb-search-section">
          <form className="rb-search-bar-wrap" onSubmit={handleSearchSubmit}>
            <span className="rb-search-icon">🔍</span>
            <input
              type="text"
              className="rb-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="도서명이나 저자명을 검색해보세요 (예: 불편한 편의점, 한강, 세이노)"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="rb-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="지우기"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="rb-search-submit-btn"
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? <span className="rb-spinner" /> : '검색'}
            </button>
          </form>

          {/* 추천 키워드 칩스 */}
          <div className="rb-search-chips">
            <span>추천:</span>
            {POPULAR_SEARCH_KEYWORDS.map((kw) => (
              <button
                key={kw}
                type="button"
                className="rb-chip-btn"
                onClick={() => handleSelectKeywordChip(kw)}
              >
                {kw}
              </button>
            ))}
          </div>

          {searchError && (
            <div style={{ color: '#e05a4e', fontSize: 15, padding: '4px 8px' }}>
              {searchError}
            </div>
          )}

          {/* 검색 결과 목록 */}
          {searchMeta && (
            <div className="rb-search-meta">
              <span>
                ✨ <strong className="rb-search-meta-highlight">'{searchMeta.query}'</strong> 검색 결과 (총 {searchMeta.total}건)
              </span>
              <span style={{ fontSize: 13, opacity: 0.8 }}>YES24 서지정보</span>
            </div>
          )}

          {isSearching && searchResults.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <LoadingSequence label="도서 정보를 검색하고 있습니다..." />
            </div>
          )}

          {hasSearched && !isSearching && searchResults.length === 0 && !searchError && (
            <div className="rb-search-empty">
              <span className="rb-search-empty-icon">📚</span>
              <strong>'{searchQuery}'에 대한 검색 결과를 찾지 못했습니다.</strong>
              <span style={{ fontSize: 14 }}>도서명이나 저자의 오타를 확인하시거나 사진/바코드로 등록해보세요.</span>
              <div className="rb-search-empty-actions">
                <button
                  type="button"
                  className="rb-btn-select"
                  onClick={() => setActiveTab('camera')}
                >
                  📷 사진 촬영으로 등록
                </button>
                <button
                  type="button"
                  className="rb-btn-select"
                  onClick={() => {
                    setActiveTab('manual');
                    setOcrDone(true);
                    setEditing(true);
                  }}
                >
                  ✍️ 직접 입력하기
                </button>
              </div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="rb-search-grid">
              {searchResults.map((item, idx) => {
                const key = item.isbn || `${item.title}-${idx}`;
                const isInstantRegistering = instantRegisteringKey === (item.isbn || item.title);

                return (
                  <div key={key} className="rb-book-card">
                    <div className="rb-card-top">
                      <div className="rb-card-cover-box">
                        <img
                          src={coverImageSrc(item.coverUrl)}
                          alt={item.title}
                          className="rb-card-cover-img"
                          onError={onFallbackCover}
                          loading="lazy"
                        />
                        {item.sideCoverUrl && (
                          <span className="rb-card-side-tag" title="책등 이미지 지원">책등</span>
                        )}
                      </div>

                      <div className="rb-card-content">
                        <div className="rb-card-title-row">
                          <h4 className="rb-card-title" title={item.title}>{item.title}</h4>
                          {typeof item.starScore === 'number' && item.starScore > 0 && (
                            <span className="rb-card-star">★ {item.starScore.toFixed(1)}</span>
                          )}
                        </div>

                        <div className="rb-card-meta">
                          {item.author && <span>{item.author}</span>}
                          {item.publisher && <span> · {item.publisher}</span>}
                        </div>

                        <div className="rb-card-badges">
                          {item.totalPages && (
                            <span className="rb-card-page-badge">📖 {item.totalPages}쪽</span>
                          )}
                          {item.publishedDate && (
                            <span className="rb-card-page-badge">📅 {item.publishedDate.slice(0, 10)}</span>
                          )}
                        </div>

                        {item.description && (
                          <p className="rb-card-desc" title={item.description}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rb-card-actions">
                      {item.isRegistered ? (
                        <div className="rb-btn-registered">
                          ✓ 내 서재에 있음
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="rb-btn-instant"
                            onClick={() => handleInstantRegister(item)}
                            disabled={isInstantRegistering || submitting || isLibraryFull}
                            title="한 번의 클릭으로 기본 서재에 즉시 추가합니다"
                          >
                            {isInstantRegistering ? (
                              <>
                                <span className="rb-spinner" />
                                꽂는 중...
                              </>
                            ) : (
                              '📥 바로 서재에 담기'
                            )}
                          </button>

                          <button
                            type="button"
                            className="rb-btn-select"
                            onClick={() => handleSelectBookForDetail(item)}
                            title="책 색상, 독서 상태, 현재 페이지 등을 직접 설정하여 등록합니다"
                          >
                            ✏️ 정보 확인
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. 사진 / 바코드 촬영 모드 및 상세 입력 폼
          ───────────────────────────────────────────────────────────── */}
      <div ref={formSectionRef} style={{ marginTop: activeTab === 'search' && searchResults.length > 0 ? 40 : 0 }}>
        {(activeTab === 'search' && (ocrDone || title)) && (
          <div style={{ borderTop: '2px dashed var(--border)', paddingTop: 28, marginBottom: 20 }}>
            <h3 style={{ fontSize: 20, margin: '0 0 16px', color: 'var(--text-h)' }}>
              📝 선택한 도서 상세 설정 및 등록
            </h3>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile || activeTab === 'manual' ? '1fr' : '220px minmax(0, 1fr)',
            gap: isMobile ? 24 : 34,
            alignItems: 'start',
            width: '100%',
          }}
        >
          {/* 왼쪽 컬럼: 사진 촬영 및 바코드 업로드 (activeTab === 'camera'일 때만 노출) */}
          {activeTab === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>ISBN 촬영</span>
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 999,
                    border: '1px solid var(--accent-border)',
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                >
                  🐾 가이드
                </button>
              </div>
              <span style={{ fontSize: 15, color: 'var(--text)' }}>
                책 뒷면이나 표지 안쪽 바코드 아래 13자리 ISBN 숫자를 촬영해주세요.
              </span>

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleInputChange}
              />

              <button
                type="button"
                onClick={() => setWebcamOpen(true)}
                style={{ padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', cursor: 'pointer', fontWeight: 600 }}
              >
                📷 사진 촬영
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                style={{ padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', cursor: 'pointer', fontWeight: 600 }}
              >
                🖼️ 이미지 업로드
              </button>

              {previewUrl && (
                <div
                  style={{
                    marginTop: 8,
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    aspectRatio: '3/4',
                    background: '#000',
                  }}
                >
                  <img src={previewUrl} alt="표지 미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {ocrLoading && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    background: 'var(--code-bg)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 15,
                    color: 'var(--text)',
                  }}
                >
                  <div className="rb-spinner" style={{ color: 'var(--accent)' }} />
                  ISBN 인식 중입니다...
                </div>
              )}
              {ocrError && <span style={{ fontSize: 15, color: '#e05a4e' }}>{ocrError}</span>}
              {ocrNotice && <span style={{ fontSize: 15, color: 'var(--text-h)' }}>{ocrNotice}</span>}

              {/* ISBN 직접 검색 입력란 */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                <span style={{ fontSize: 14, color: 'var(--text)' }}>ISBN 직접 입력</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchIsbn();
                      }
                    }}
                    placeholder="예: 9791164794348"
                    style={{ flex: 1, minWidth: 0, padding: '7px 8px', fontSize: 15, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)' }}
                  />
                  <button
                    type="button"
                    onClick={handleSearchIsbn}
                    disabled={isbnSearching || ocrLoading}
                    style={{
                      padding: '7px 10px',
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      borderRadius: 6,
                      border: '1px solid var(--accent-border)',
                      background: 'var(--accent-bg)',
                      color: 'var(--text-h)',
                      cursor: (isbnSearching || ocrLoading) ? 'not-allowed' : 'pointer',
                      opacity: (isbnSearching || ocrLoading) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {isbnSearching ? <span className="rb-spinner" /> : '조회'}
                  </button>
                </div>
              </label>
            </div>
          )}

          {/* 오른쪽/중앙 폼 영역: 인식 결과 및 직접 수정 */}
          {(activeTab !== 'search' || (activeTab === 'search' && (ocrDone || title))) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 17 }}>
                  {activeTab === 'manual' ? '도서 정보 직접 입력' : '도서 정보 확인 및 수정'}
                </span>
                {ocrDone && activeTab === 'camera' && (
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    style={{
                      fontSize: 15,
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: '1px solid var(--accent-border)',
                      background: editing ? 'var(--accent)' : 'var(--accent-bg)',
                      color: editing ? '#fff' : 'var(--text-h)',
                      cursor: 'pointer',
                    }}
                  >
                    {editing ? '수정 완료' : '수정'}
                  </button>
                )}
              </div>

              {ocrLoading ? (
                <LoadingSequence label="잠시만 기다려주세요..." />
              ) : (
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: isMobile ? 'center' : 'flex-start' }}>
                  {/* 책 표지 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <img
                      src={coverImageSrc(extraMeta.coverUrl)}
                      alt={title ? `${title} 표지` : '책 표지'}
                      style={{
                        width: isMobile ? 120 : 130,
                        height: 180,
                        objectFit: 'cover',
                        display: 'block',
                        background: '#1a1a20',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      }}
                      onError={onFallbackCover}
                    />
                    {extraMeta.sideCoverUrl && (
                      <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                        ✨ YES24 고화질 표지 적용됨
                      </span>
                    )}
                  </div>

                  {/* 표지 옆 입력 필드 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0, width: '100%' }}>
                    {[
                      {
                        key: 'title',
                        label: '제목 *',
                        node: editing ? (
                          <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="책 제목을 입력해주세요"
                            style={compactFieldStyle}
                            required
                          />
                        ) : (
                          <div style={compactViewStyle}>{title || '(입력된 제목 없음)'}</div>
                        ),
                      },
                      {
                        key: 'author',
                        label: '저자 *',
                        node: editing ? (
                          <input
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder="저자명을 입력해주세요"
                            style={compactFieldStyle}
                            required
                          />
                        ) : (
                          <div style={compactViewStyle}>{author || '(입력된 저자 없음)'}</div>
                        ),
                      },
                      {
                        key: 'isbn',
                        label: 'ISBN',
                        node: editing ? (
                          <input
                            value={isbn}
                            onChange={(e) => setIsbn(e.target.value)}
                            placeholder="13자리 ISBN (선택)"
                            style={compactFieldStyle}
                          />
                        ) : (
                          <div style={compactViewStyle}>{isbn || '(미입력)'}</div>
                        ),
                      },
                      {
                        key: 'genre',
                        label: genreLoading ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="rb-spinner" style={{ width: 11, height: 11, color: 'var(--accent)' }} />
                            장르 (분류 중...)
                          </span>
                        ) : '장르',
                        node: editing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <select value={genre} onChange={(e) => setGenre(e.target.value)} style={compactFieldStyle}>
                              <option value={GENRE_NONE}>미지정</option>
                              {GENRE_DEFS.map((g) => (
                                <option key={g.code} value={g.code}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                            {(subject || displayGenre) && (
                              <span style={{ fontSize: 13, color: 'var(--accent)', paddingLeft: 2 }}>
                                세부 분야: {displayGenre || subject}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={compactViewStyle}>{getGenreSubLabel(genre, subject, displayGenre)}</div>
                        ),
                      },
                    ].map(({ key, label, node }) => (
                      <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>{label}</span>
                        {node}
                      </label>
                    ))}

                    {/* 책 색상 팔레트 */}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>책등 및 표지 색상</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {presets.map((p, i) => (
                          <button
                            type="button"
                            key={i}
                            disabled={!editing}
                            onClick={() => editing && setColorIdx(i)}
                            title={`색상 ${i + 1}`}
                            style={{
                              width: 38,
                              height: 48,
                              borderRadius: 6,
                              border: colorIdx === i ? '3px solid var(--accent)' : '1px solid var(--border)',
                              background: `linear-gradient(90deg, ${p.spine} 0 40%, ${p.cover} 40% 100%)`,
                              cursor: editing ? 'pointer' : 'default',
                              opacity: editing ? 1 : 0.85,
                              boxShadow: colorIdx === i ? '0 0 8px var(--accent)' : 'none',
                              transition: 'transform 0.15s ease',
                              transform: colorIdx === i ? 'scale(1.05)' : 'none',
                            }}
                          />
                        ))}
                      </div>
                    </label>

                    {/* 총 페이지 수 & 현재 읽은 페이지 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>총 쪽수 (페이지) *</span>
                        <input
                          type="number"
                          min={1}
                          value={totalPage}
                          onChange={(e) => setTotalPage(e.target.value)}
                          placeholder="예: 320"
                          style={compactFieldStyle}
                          required
                        />
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>현재 읽은 쪽수 📖</span>
                        <input
                          type="number"
                          min={0}
                          value={currentPage}
                          onChange={(e) => setCurrentPage(e.target.value)}
                          placeholder="예: 0"
                          style={compactFieldStyle}
                        />
                      </label>
                    </div>

                    {totalPage && (
                      <span style={{ fontSize: 14, color: 'var(--text)', opacity: 0.9 }}>
                        독서 상태: <strong>{deriveStatus(currentPage, totalPage)}</strong> · 두께: {thickness} (자동 계산)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 최종 등록 버튼 */}
          {(activeTab !== 'search' || (activeTab === 'search' && (ocrDone || title))) && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 12 }}>
              {isLibraryFull && (
                <span style={{ color: '#e05a4e', fontSize: 16 }}>
                  서재 선반이 가득 찼어요. 최대 {MAX_LIBRARY_BOOKS}권까지 등록할 수 있어요.
                </span>
              )}
              {submitError && (
                <span style={{ color: '#e05a4e', fontSize: 16 }}>{submitError}</span>
              )}
              <button
                type="submit"
                disabled={!allFilled || submitting || isLibraryFull}
                style={{
                  padding: '12px 36px',
                  fontSize: 18,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: 'none',
                  background: allFilled && !submitting && !isLibraryFull ? 'var(--accent)' : 'var(--border)',
                  color: allFilled && !submitting && !isLibraryFull ? '#fff' : 'var(--text)',
                  cursor: allFilled && !submitting && !isLibraryFull ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: allFilled && !submitting && !isLibraryFull ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
                  transition: 'opacity 0.2s ease, transform 0.1s ease',
                }}
              >
                {submitting && <span className="rb-spinner" style={{ color: '#fff' }} />}
                {submitting ? '등록 중...' : '내 서재에 꽂기'}
              </button>
            </div>
          )}
        </form>
      </div>

      {webcamOpen && (
        <WebcamCaptureModal guideFrame onCapture={handleWebcamCapture} onClose={() => setWebcamOpen(false)} />
      )}

      {guideOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
            }}
            onClick={() => setGuideOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(480px, 92vw)', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', color: 'var(--text-h)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 19 }}>📷 ISBN 촬영 가이드</h3>
                <button
                  onClick={() => setGuideOpen(false)}
                  style={{ border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 22 }}
                >
                  ✕
                </button>
              </div>
              <img
                src="/ISBN_guide.jpg"
                alt="책 뒷면 바코드 아래 ISBN 숫자를 촬영하는 예시"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 10, border: '1px solid var(--border)' }}
              />
              <span style={{ display: 'block', marginTop: 10, fontSize: 13, color: 'var(--text)', lineHeight: 1.4, textAlign: 'center' }}>
                업로드 가능한 이미지 최대 크기: {MAX_IMAGE_SIZE_MB}MB / 지원 파일 형식: JPG, PNG
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
