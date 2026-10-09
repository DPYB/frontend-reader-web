import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBooks } from '../store/booksStore';
import { useLibrarian } from '../store/librarianStore';
import { getColorPresets, extractDominantColorIndex, loadImage } from '../features/register/ocrUtils';
import { GENRE_CODES, GENRE_NONE, genreCode, detectGenreCode } from '../data/genres';
import { classifyGenre } from '../api/genreApi';
import { createOcrCover } from '../api/recordApi';
import { searchBookByIsbn, searchBooksByKeyword, toReadingStatus } from '../api/bookApi';
import { setVisual } from '../store/bookVisuals';
import { ApiError } from '../api/authApi';
import { getBookThickness } from '../features/room/bookExtractor';
import WebcamCaptureModal from '../features/room/WebcamCaptureModal';
import RecommendationBanner from '../features/register/RecommendationBanner';
import BookSearchSection from '../features/register/BookSearchSection';
import BookIsbnScanSection from '../features/register/BookIsbnScanSection';
import BookRegisterForm from '../features/register/BookRegisterForm';
import IsbnGuideModal from '../features/register/IsbnGuideModal';
import { useResponsive } from '../hooks/useResponsive';
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
function getGenreSubLabel(genreCodeValue, subject = '', displayGenre = '') {
  if (!genreCodeValue || genreCodeValue === GENRE_NONE) return '미지정';

  if (displayGenre && displayGenre.trim()) {
    const trimmed = displayGenre.trim();
    if (trimmed.includes('(') || trimmed.startsWith(genreCodeValue)) {
      return trimmed;
    }
    return `${genreCodeValue} (${trimmed})`;
  }

  if (subject && subject.trim() && subject.trim() !== genreCodeValue) {
    return `${genreCodeValue} (${subject.trim()})`;
  }

  return genreCodeValue;
}

// 서재 선반 최대 권수
const MAX_LIBRARY_BOOKS = 50;

// 추천 검색어 태그 목록
const POPULAR_SEARCH_KEYWORDS = ['불편한 편의점', '소년이 온다', '세이노의 가르침', '마흔에 읽는 쇼펜하우어', '트렌드 코리아', '모순'];

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

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
  const [activeTab, setActiveTab] = useState(() => location.state?.tab || 'search');

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
  const { isUnifiedMobileUX: isMobile } = useResponsive();

  const isLibraryFull = !ocrBookId && books.length >= MAX_LIBRARY_BOOKS;

  /**
   * 장르 자동 분류
   */
  const autoClassifyGenre = useCallback(async ({ title: t, author: a, isbn: is = '', rawCategory = '' }) => {
    if (!t?.trim()) return;
    setGenreLoading(true);
    try {
      const result = await classifyGenre({ title: t, author: a, isbn: is, rawCategory });
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
    const bookThickness = getBookThickness(safeTotalPages);
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
        thickness: bookThickness,
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
    if (e && e.preventDefault) e.preventDefault();
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

  const handleSwitchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'manual') {
      setOcrDone(true);
      setEditing(true);
    }
  };

  const formWrapperClass = `rb-form-wrapper ${activeTab === 'search' && searchResults.length > 0 ? 'with-search-results' : ''}`;
  const formLayoutClass = `rb-form-layout ${
    activeTab === 'camera' ? 'camera-mode' : activeTab === 'manual' ? 'manual-mode' : 'search-mode'
  }`;

  return (
    <div className="rb-container">
      {toastMessage && (
        <div className="rb-success-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      <h2 className="rb-title">책 등록</h2>

      <RecommendationBanner
        fromRecommendation={fromRecommendation}
        onClose={() => setFromRecommendation(false)}
      />

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
          📷 ISBN·표지
        </button>
        <button
          type="button"
          className={`rb-mode-tab ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('manual')}
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
        <BookSearchSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          popularKeywords={POPULAR_SEARCH_KEYWORDS}
          onSelectKeywordChip={handleSelectKeywordChip}
          searchError={searchError}
          searchMeta={searchMeta}
          isSearching={isSearching}
          hasSearched={hasSearched}
          searchResults={searchResults}
          instantRegisteringKey={instantRegisteringKey}
          submitting={submitting}
          isLibraryFull={isLibraryFull}
          onInstantRegister={handleInstantRegister}
          onSelectBookForDetail={handleSelectBookForDetail}
          onSwitchTab={handleSwitchTab}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. 사진 / 바코드 촬영 모드 및 상세 입력 폼
          ───────────────────────────────────────────────────────────── */}
      <div ref={formSectionRef} className={formWrapperClass}>
        {activeTab === 'search' && (ocrDone || title) && (
          <div className="rb-detail-section-header">
            <h3 className="rb-detail-section-title">
              📝 선택한 도서 상세 설정 및 등록
            </h3>
          </div>
        )}

        <form onSubmit={handleSubmit} className={formLayoutClass}>
          {activeTab === 'camera' && (
            <BookIsbnScanSection
              onOpenGuide={() => setGuideOpen(true)}
              uploadInputRef={uploadInputRef}
              onInputChange={handleInputChange}
              onOpenWebcam={() => setWebcamOpen(true)}
              previewUrl={previewUrl}
              ocrLoading={ocrLoading}
              ocrError={ocrError}
              ocrNotice={ocrNotice}
              isbn={isbn}
              setIsbn={setIsbn}
              onSearchIsbn={handleSearchIsbn}
              isbnSearching={isbnSearching}
            />
          )}

          <BookRegisterForm
            activeTab={activeTab}
            ocrDone={ocrDone}
            title={title}
            setTitle={setTitle}
            author={author}
            setAuthor={setAuthor}
            isbn={isbn}
            setIsbn={setIsbn}
            genre={genre}
            setGenre={setGenre}
            genreLoading={genreLoading}
            subject={subject}
            displayGenre={displayGenre}
            genreSubLabel={getGenreSubLabel(genre, subject, displayGenre)}
            presets={presets}
            colorIdx={colorIdx}
            setColorIdx={setColorIdx}
            totalPage={totalPage}
            setTotalPage={setTotalPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            derivedStatus={deriveStatus(currentPage, totalPage)}
            thickness={thickness}
            extraMeta={extraMeta}
            editing={editing}
            setEditing={setEditing}
            ocrLoading={ocrLoading}
            isMobile={isMobile}
            isLibraryFull={isLibraryFull}
            maxLibraryBooks={MAX_LIBRARY_BOOKS}
            submitError={submitError}
            submitting={submitting}
            allFilled={allFilled}
            onSubmit={handleSubmit}
          />
        </form>
      </div>

      {webcamOpen && (
        <WebcamCaptureModal guideFrame onCapture={handleWebcamCapture} onClose={() => setWebcamOpen(false)} />
      )}

      <IsbnGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        maxImageSizeMb={MAX_IMAGE_SIZE_MB}
      />
    </div>
  );
}
