import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../../store/booksStore';
import { answerQuestion } from './chatEngine';
import { streamChatMessage } from '../../api/chatApi';
import { getUserLocation } from '../../api/geolocation';
import { formatRecommendedBooks, extractLibraryBooksFromAnswer, getColorIndex, getBookThickness } from './bookExtractor';
import MarkdownRenderer from './MarkdownRenderer';
import WeatherMoodBadge from './WeatherMoodBadge';
import {
  useLibrarian,
  loadSavedChatSessionByLibrarian,
  saveChatSessionByLibrarian,
} from '../../store/librarianStore';
import { toKoreanStatus } from '../../api/bookApi';
import LoadingSequence from '../../components/LoadingSequence';
import { DEBATE_PERSONAS } from '../../data/debatePersonas';
import { LIBRARIANS } from '../../data/librarians';
import './LibrarianChat.css';

// 백엔드(discovery) ChatRequest.message max_length와 동일하게 맞춘다 (CLIAR-184/185)
const MAX_MESSAGE_LENGTH = 2000;

/**
 * 고유 대화 세션 UUID 생성 (crypto.randomUUID 폴백 지원)
 */
function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 도서명 공백 및 특수기호 무시 정규화 (책 매칭용)
function normalizeTitle(str) {
  return (str || '')
    .trim()
    .replace(/[\s\-_:.,·'"`『』《》()（）]/g, '')
    .toLowerCase();
}

/**
 * 질문 의도에 따른 사서별 맥락 맞춤형 로딩 안내 멘트 생성
 */
function getContextualLoadingMessage(message, librarianId) {
  const q = (message || '').trim().toLowerCase();

  // 1. 단순 인사 및 소개
  if (/^(안녕|반가|하이|hi|hello|누구|소개|안뇽)/i.test(q)) {
    if (librarianId === 'stork') return '🪿 정중하게 인사를 준비하고 있습니다... 🪶';
    if (librarianId === 'nudi') return '🐌 부드럽게 인사를 건네려고 준비하고 있어요 누누...';
    if (librarianId === 'gecko') return '🦎 반갑게 인사할 준비를 하고 있지 크크!';
    return '🐾 반갑게 인사를 건네려고 준비 중이다 냥...';
  }

  // 2. 내 서재 조회 (서재, 읽던 책, 진행률, 내 책, 목록, 읽은 책)
  if (/(서재|읽던|내\s*책|내책|진행|완독|기록|보유|내가\s*읽|목록)/i.test(q)) {
    if (librarianId === 'stork') return '🪿 서재의 독서 기록을 차분히 살피고 있습니다... 🪶';
    if (librarianId === 'nudi') return '🐌 서재 속 소중한 독서 기록들을 조용히 돌아보고 있어요 누누...';
    if (librarianId === 'gecko') return '🦎 서재에 남긴 책 기록들을 신나게 살펴보고 있지 크크!';
    return '🐾 서재에서 집사님의 책 기록을 찾아보고 있다 냥...';
  }

  // 3. 도서 추천 (추천, 골라, 책 찾아, 소설, 장르 등)
  if (/(추천|골라|책\s*찾|도서\s*찾|소설|인문|경제|경영|스릴러|미스터리)/i.test(q)) {
    if (librarianId === 'stork') return '🪿 슈빌 사서가 전문 분야의 맞춤 명저를 선별하고 있습니다... 🪶';
    if (librarianId === 'nudi') return '🐌 마음에 깊은 여운을 남겨줄 책을 떠올리고 있어요 누누... 📖';
    if (librarianId === 'gecko') return '🦎 흥미롭고 딱 맞는 책이 뭔지 탐색하고 있지 크크! 📚';
    return '어떤 책이 좋을지 생각해볼게 냥…📖🐈';
  }

  // 4. 날씨 / 분위기 / 기분
  if (/(날씨|비|눈|더위|추위|기분|우울|신나|위로)/i.test(q)) {
    if (librarianId === 'stork') return '🪿 오늘의 날씨와 기분에 어울리는 이야기를 생각하고 있습니다... 🪶';
    if (librarianId === 'nudi') return '🐌 오늘의 날씨와 마음에 스며드는 이야기를 느끼고 있어요 누누... 💧';
    if (librarianId === 'gecko') return '🦎 오늘 같은 날씨와 분위기에 딱 어울리는 이야기를 찾고 있지 크크! 🌤️';
    return '🐾 오늘 분위기에 맞는 이야기를 떠올리고 있다 냥...';
  }

  // 5. 독서 토론 마무리 / 총평 요청
  if (/(토론\s*마무리|토론\s*종료|총평|피날레|마무리\s*및|책\s*추천받기)/i.test(q)) {
    if (librarianId === 'stork') return '🪿 토론 내용을 깊이 있게 정리하고 서재 기억으로 저장하고 있습니다... 🪶';
    if (librarianId === 'nudi') return '🐌 함께 나눈 소중한 생각들을 가슴 깊이 간직하고 있어요 누누... 💭';
    if (librarianId === 'gecko') return '🦎 오늘 나눈 멋진 토론의 핵심을 쏙쏙 정리하고 있지 크크! 💡';
    return '🐾 오늘 나눈 토론 이야기를 갈무리하고 서재 기억에 담고 있다 냥... 🧠✨';
  }

  // 6. 일반 질문 / 일상 대화
  if (librarianId === 'stork') return '🪿 사서가 답변을 정리하고 있습니다... 🪶';
  if (librarianId === 'nudi') return '🐌 사서가 마음에 담아둘 이야기를 생각하고 있어요 누누...';
  if (librarianId === 'gecko') return '🦎 사서가 열심히 생각하고 있지 크크!';
  return '🐾 사서가 열심히 생각하고 있다 냥...';
}

/**
 * 도서 추천 의도 질문인지 판별 (CLIAR-285)
 */
function isBookRecommendationQuery(message) {
  const q = (message || '').trim().toLowerCase();
  return /(추천|골라|책\s*찾|도서\s*찾|소설|인문|경제|경영|스릴러|미스터리)/i.test(q);
}

/**
 * 도서 추천 대기 문구 (사서별)
 */
function getRecommendationLoadingMessage(librarianId) {
  if (librarianId === 'stork') return '🪿 슈빌 사서가 전문 분야의 맞춤 명저를 선별하고 있습니다... 🪶';
  if (librarianId === 'nudi') return '🐌 마음에 깊은 여운을 남겨줄 책을 떠올리고 있어요 누누... 📖';
  if (librarianId === 'gecko') return '🦎 흥미롭고 딱 맞는 책이 뭔지 탐색하고 있지 크크! 📚';
  return '어떤 책이 좋을지 생각해볼게 냥…📖🐈';
}

/**
 * LibrarianChat — 오른쪽 하단 질문 입력 패널.
 * 백엔드(/api/v1/chat)로 동기 요청(stream: false)하고, 실패 시 로컬 chatEngine을 fallback으로 사용합니다.
 *
 * @param {object} librarian - 현재 사서
 * @param {{text,switchTo,library_books,libraryBooks,recommended_books,recommendedBooks}|null} answer - 현재 답변
 * @param {(res)=>void} onAnswer - 답변 갱신
 * @param {(bookOrId)=>void} [onOpenDetail] - 서재 도서 상세 보기(책 열기) 모달 열기 핸들러
 * @param {(loading:boolean)=>void} [onLoadingChange] - 답변 대기(thinking) 상태 변경 알림
 *   (사서 커서가 답변 대기 중 이미지로 전환하는 데 사용)
 */
export default function LibrarianChat({ librarian, answer, onAnswer, onOpenDetail, onLoadingChange }) {
  const { books } = useBooks();
  const { names: librarianNames } = useLibrarian();
  const navigate = useNavigate();

  // CLIAR-257: 추천 도서 등록 후 뒤로가기 시 대화/추천 카드 복원
  const [open, setOpen] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id);
    if (saved?.open !== undefined) return saved.open;
    return Boolean(answer?.text);
  });

  // 모바일 뷰포트 (<= 768px) 감지
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // 모바일 FAB 위치 상태 (x, y)
  const [fabPos, setFabPos] = useState(null);
  const dragInfoRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, hasMoved: false });

  const getClampPos = useCallback((x, y) => {
    const btnSize = 54;
    const minX = 12;
    const maxX = Math.max(minX, window.innerWidth - btnSize - 12);
    const minY = 60; // 상단 GNB 아래
    const maxY = Math.max(minY, window.innerHeight - btnSize - 74); // 하단 메뉴바 위
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setFabPos((prev) => {
          if (prev) return getClampPos(prev.x, prev.y);
          // 독서 타이머 버튼 위로 뜨도록 초기 Y 위치 설정
          return getClampPos(window.innerWidth - 68, window.innerHeight - 190);
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getClampPos]);

  // 사서 패널 모드: 'chat' (일반 대화) | 'library' (내 서재 빠른 조회) | 'debate' (사서 토론)
  const [chatMode, setChatMode] = useState('chat');

  // 모드별 독립 대화 상태 및 세션 분리 (모드 전환 시 답변 누적/길어짐 방지)
  const [modeAnswers, setModeAnswers] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id);
    return {
      chat: saved?.answer || null,
      debate: null,
      library: null,
    };
  });

  // 메신저형 멀티턴 대화 히스토리: { chat: [], debate: [], library: [] }
  const [modeMessages, setModeMessages] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id);
    const initialChat = [];
    if (saved?.messages && Array.isArray(saved.messages) && saved.messages.length > 0) {
      return {
        chat: saved.messages,
        debate: [],
        library: [],
      };
    }
    if (saved?.lastUserMessage) {
      initialChat.push({ role: 'user', text: saved.lastUserMessage });
    }
    if (saved?.answer?.text) {
      initialChat.push({
        role: 'assistant',
        text: saved.answer.text,
        senderIcon: saved?.answer?.senderIcon || librarian?.icon,
        senderName: saved?.answer?.senderName || librarianNames[librarian?.id] || librarian?.displayName || librarian?.name,
        recommendedBooks: saved?.answer?.recommended_books || saved?.answer?.recommendedBooks || [],
        libraryBooks: saved?.answer?.library_books || saved?.answer?.libraryBooks || [],
        isConcluded: Boolean(saved?.answer?.is_concluded),
        debateSummary: saved?.answer?.debate_summary || null,
        signals: saved?.answer?.signals || null,
        switchTo: saved?.answer?.switchTo || null,
      });
    }
    return {
      chat: initialChat,
      debate: [],
      library: [],
    };
  });

  const messagesEndRef = useRef(null);

  const [chatSessionId, setChatSessionId] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id);
    return saved?.sessionId || answer?.sessionId || null;
  });
  const [debateSessionId, setDebateSessionId] = useState(null);

  // 내 서재 조회 모드 상태 (검색어, 상태 필터)
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('ALL'); // 'ALL' | 'READING' | 'COMPLETED' | 'PLANNED'

  // 선택된 토론자 (4인 오마주: DEBATE_CRITIC, DEBATE_STORYTELLER, DEBATE_COUNSELOR, DEBATE_OBSERVER).
  const [debaterPersona, setDebaterPersona] = useState('DEBATE_CRITIC');
  // 토론 모드 설정 단계: 'debater' (1단계: 토론 상대 선택) | 'topic' (2단계: 주제/도서 선택)
  const [debateStep, setDebateStep] = useState('debater');
  // 선택된 토론 대상 도서 (null이면 '나만의 주제로 토론하기')
  const [selectedDebateBook, setSelectedDebateBook] = useState(null);
  // 토론 모드 내 서재 도서 검색어
  const [debateBookQuery, setDebateBookQuery] = useState('');
  // 토론 대화 진행 중 상단 설정(도서/4인 카드)을 접어 스크롤 영역을 넓히는 토글 상태
  const [debateCollapsed, setDebateCollapsed] = useState(() => Boolean(modeAnswers?.debate?.text || modeMessages?.debate?.length));

  const [input, setInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(false);

  const [lastUserMessage, setLastUserMessage] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id);
    return saved?.lastUserMessage || '';
  });
  // 로딩 문구 분기용 대화 턴 수 (CLIAR-285): 첫 질문엔 환영 문구, 이후엔 맥락 문구.
  const [turnCount, setTurnCount] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id);
    return saved?.lastUserMessage ? 1 : 0;
  });

  // 진행 중인 스트리밍 요청 취소 컨트롤러 (유령 답변 방지)
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 사서(librarian.id) 전환 시 화면 말풍선 도화지 및 세션 분리/복원
  const activeLibIdRef = useRef(librarian?.id);
  const isSwitchingRef = useRef(false);

  useEffect(() => {
    const currentLibId = librarian?.id;
    if (activeLibIdRef.current !== currentLibId) {
      isSwitchingRef.current = true;
      activeLibIdRef.current = currentLibId;
      // 새 사서의 저장된 세션 로드 (없으면 깨끗한 초기 상태)
      const saved = loadSavedChatSessionByLibrarian(currentLibId);
      if (saved) {
        setModeAnswers({
          chat: saved.answer || null,
          debate: null,
          library: null,
        });
        setModeMessages({
          chat: Array.isArray(saved.messages) ? saved.messages : [],
          debate: [],
          library: [],
        });
        setChatSessionId(saved.sessionId || null);
        setLastUserMessage(saved.lastUserMessage || '');
        setTurnCount(saved.lastUserMessage ? 1 : 0);
        setDebateStep('debater');
        setSelectedDebateBook(null);
        setDebateBookQuery('');
        setDebateCollapsed(false);
        if (onAnswer) onAnswer(saved.answer || null);
      } else {
        // 새 사서와의 첫 만남: 이전 사서의 말풍선 잔류 없이 깨끗한 도화지 초기화
        setModeAnswers({
          chat: null,
          debate: null,
          library: null,
        });
        setModeMessages({
          chat: [],
          debate: [],
          library: [],
        });
        setChatSessionId(null);
        setLastUserMessage('');
        setTurnCount(0);
        setDebateStep('debater');
        setSelectedDebateBook(null);
        setDebateBookQuery('');
        setDebateCollapsed(false);
        if (onAnswer) onAnswer(null);
      }
    }
  }, [librarian?.id, onAnswer]);

  // 현재 모드에 해당하는 유효 답변 및 메시지 목록
  const currentAnswer = modeAnswers[chatMode] || null;
  const currentMessages = useMemo(() => modeMessages[chatMode] || [], [modeMessages, chatMode]);

  // 메시지 목록 추가 시 최하단으로 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages, loading]);

  // 답변 대기(thinking) 상태를 부모(LibraryScene)에 전달 — 사서 커서가 대기 이미지로 전환
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // CLIAR-257: 대화 응답이나 세션 정보 변경 시 사서별 sessionStorage에 동기화
  useEffect(() => {
    // 사서 전환 직후의 렌더링에서는 이전 사서의 상태가 아직 남아있으므로 새 사서 키에 저장하지 않음
    if (isSwitchingRef.current) {
      isSwitchingRef.current = false;
      return;
    }
    const targetId = activeLibIdRef.current;
    if (!targetId) return;

    if (modeAnswers.chat || chatSessionId || lastUserMessage || modeMessages.chat.length > 0) {
      saveChatSessionByLibrarian(targetId, {
        answer: modeAnswers.chat,
        messages: modeMessages.chat,
        sessionId: chatSessionId,
        lastUserMessage,
        open,
      });
    }
  }, [modeAnswers.chat, modeMessages.chat, chatSessionId, lastUserMessage, open]);

  // 1. 내 서재 도서 조회 결과 (ADR 0006: 백엔드 response.library_books 또는 ### 📚 마크다운 블록 또는 내 서재 본문 매칭)
  const backendLibraryBooks = useMemo(
    () => currentAnswer?.library_books || currentAnswer?.libraryBooks || [],
    [currentAnswer?.library_books, currentAnswer?.libraryBooks]
  );

  // 2. 외부 도서 추천: 백엔드 recommended_books 구조화 배열 직접 활용 (CLIAR-229)
  const backendRecommendedBooks = useMemo(
    () => currentAnswer?.recommended_books || currentAnswer?.recommendedBooks || [],
    [currentAnswer?.recommended_books, currentAnswer?.recommendedBooks]
  );

  const answerText = currentAnswer?.text;

  const libraryBooks = useMemo(() => {
    // 토론 모드에서는 책에 대한 토론에 집중하기 위해 서재 도서 카드를 띄우지 않는다.
    if (chatMode === 'debate') return [];
    if (backendLibraryBooks.length > 0) return backendLibraryBooks;
    if (!answerText || loading) return [];

    // 1) ADR 0006 표준: ### 📚 마크다운 블록 우선 파싱
    const fromMarkdown = extractLibraryBooksFromAnswer(answerText);
    if (fromMarkdown.length > 0) return fromMarkdown;

    // 2) 신규 도서 추천(### 📖, recommended_books 또는 1. 《도서명》 추천 목록)인 경우는 절대 서재 도서로 오인하지 않음
    const isRecommendationResponse =
      answerText.includes('### 📖') ||
      backendRecommendedBooks.length > 0 ||
      /^\s*\d+\.\s*(?:\*\*)?[『《]/m.test(answerText);

    if (!isRecommendationResponse) {
      const bracketedTitles = Array.from(
        answerText.matchAll(/[『《]\s*([^』》]+?)\s*[』》]/g)
      ).map((m) => m[1].trim());
      const normalizedAnswer = normalizeTitle(answerText);

      return books.filter((b) => {
        if (!b.title || b.title.trim().length < 1) return false;
        const normBTitle = normalizeTitle(b.title);
        if (!normBTitle) return false;
        return (
          bracketedTitles.some((t) => normalizeTitle(t) === normBTitle) ||
          (normBTitle.length >= 2 && normalizedAnswer.includes(normBTitle))
        );
      });
    }

    return [];
  }, [chatMode, backendLibraryBooks, answerText, loading, books, backendRecommendedBooks]);

  // 1-1. 내 서재 빠른 조회 모드 전용 필터링 목록 (Core API 데이터 기반 즉시 키워드 필터)
  const filteredLibraryBooks = useMemo(() => {
    const rawQuery = libraryQuery.trim();

    return books.filter((b) => {
      // 1. 명시적 상태 필터 매칭
      if (libraryFilter === 'READING' && b.status !== '읽는 중') return false;
      if (libraryFilter === 'COMPLETED' && b.status !== '완독') return false;
      if (libraryFilter === 'PLANNED' && b.status !== '시작전') return false;

      if (!rawQuery) return true;

      const q = rawQuery.toLowerCase();
      const normQ = normalizeTitle(q);
      const title = (b.title || '').toLowerCase();
      const normTitle = normalizeTitle(b.title);
      const author = (b.author || '').toLowerCase();
      const normAuthor = normalizeTitle(b.author);

      // 단순 문자열 또는 공백/특수문자 무시 제목/저자 매칭
      return (
        title.includes(q) ||
        author.includes(q) ||
        normTitle.includes(normQ) ||
        normAuthor.includes(normQ)
      );
    });
  }, [books, libraryFilter, libraryQuery]);

  const switchTo = currentAnswer?.switchTo;

  // switchTo 사서/페르소나 명칭 결정 (이름 누락 방지 fallback 체인)
  const targetSwitchName = useMemo(() => {
    if (!switchTo) return '';
    const switchId = switchTo.id || switchTo.librarianId || switchTo.librarian_id;
    if (librarianNames[switchId]) return librarianNames[switchId];
    const registered = LIBRARIANS.find(
      (l) => l.id === switchId || l.typeCode === switchId
    );
    if (registered) return registered.displayName || registered.defaultName || registered.name;
    const debateMatch = DEBATE_PERSONAS.find((dp) => dp.id === switchId);
    if (debateMatch) return debateMatch.name;
    return switchTo.name || switchTo.displayName || switchId || '다른 사서';
  }, [switchTo, librarianNames]);

  // 토론 피날레 완료 여부 및 토론 요약 (agent.debate_insights 자동 저장 연계)
  const isConcluded = Boolean(currentAnswer?.is_concluded || currentAnswer?.isConcluded);
  const debateSummary = currentAnswer?.debate_summary || currentAnswer?.debateSummary || null;

  // 선택된 토론자 객체 (배너 요약 및 프롬프트 조합용)
  const selectedDebatePersona = useMemo(
    () => DEBATE_PERSONAS.find((p) => p.id === debaterPersona) || DEBATE_PERSONAS[0],
    [debaterPersona]
  );

  // 토론 모드 2단계: 내 서재 도서 검색 필터링 목록
  const debateLibraryBooks = useMemo(() => {
    const rawQuery = debateBookQuery.trim();
    if (!rawQuery) return books;
    const q = rawQuery.toLowerCase();
    const normQ = normalizeTitle(q);
    return books.filter((b) => {
      const title = (b.title || '').toLowerCase();
      const normTitle = normalizeTitle(b.title);
      const author = (b.author || '').toLowerCase();
      const normAuthor = normalizeTitle(b.author);
      return (
        title.includes(q) ||
        author.includes(q) ||
        normTitle.includes(normQ) ||
        normAuthor.includes(normQ)
      );
    });
  }, [books, debateBookQuery]);

  const recommendedBooks = useMemo(() => {
    if (backendRecommendedBooks.length > 0 && !loading && !switchTo) {
      return formatRecommendedBooks(backendRecommendedBooks);
    }
    return [];
  }, [backendRecommendedBooks, loading, switchTo]);

  const handleRegisterBook = (book) => {
    // API 응답의 recommended_books 배열에서 매칭되는 항목 확인
    const matchedBook = backendRecommendedBooks.find(
      (b) =>
        (b.title || '').trim() === (book.title || '').trim() ||
        normalizeTitle(b.title) === normalizeTitle(book.title)
    );

    const title = (matchedBook?.title || book.title || '').trim();
    // 1. "저자" 입력란 -> recommended_books[i].author 사용 (쪽수 제외된 순수 저자명)
    const author = (matchedBook?.author ?? book.author ?? '').trim();
    // 2. "총 페이지 수" 입력란 -> recommended_books[i].page_count 사용 (정수, 확인 불가 시 null)
    const pageCount =
      typeof matchedBook?.page_count === 'number' && Number.isFinite(matchedBook.page_count)
        ? matchedBook.page_count
        : typeof book.page_count === 'number' && Number.isFinite(book.page_count)
          ? book.page_count
          : typeof book.totalPage === 'number' && Number.isFinite(book.totalPage)
            ? book.totalPage
            : null;
    // 3. "장르" 입력란 -> recommended_books[i].genre 사용 (16개 표준 Enum). (CLIAR-244)
    //    추천 시점에 판단된 장르를 그대로 등록 폼에 자동 매칭한다. 없으면 undefined로
    //    남겨 RegisterBook이 미지정 처리하도록 한다(classify-genre는 ISBN 전용이라
    //    title/author 재분류로는 못 채움).
    const genre = matchedBook?.genre || book.genre || undefined;

    // CLIAR-257: 추천 도서 등록 화면으로 이동하기 직전 현재 대화 상태를 사서별 sessionStorage에 저장
    saveChatSessionByLibrarian(librarian?.id, {
      answer: modeAnswers.chat || currentAnswer,
      messages: modeMessages.chat,
      sessionId: chatSessionId,
      lastUserMessage,
      open: true, // 복귀 시 패널이 열린 상태로 복원되도록
    });

    navigate('/register', {
      state: {
        fromAIRecommendation: true,
        book: {
          title,
          author,
          isbn: matchedBook?.isbn || book.isbn || '',
          publisher: matchedBook?.publisher || book.publisher || '',
          coverUrl: matchedBook?.cover_url || matchedBook?.coverUrl || book.coverUrl || book.cover_url || '',
          cover_url: matchedBook?.cover_url || matchedBook?.coverUrl || book.coverUrl || book.cover_url || '',
          page_count: pageCount,
          totalPage: pageCount,
          genre,
          currentPage: book.currentPage ?? 0,
          colorIdx: book.colorIdx ?? getColorIndex(title),
          thickness: book.thickness ?? getBookThickness(pageCount),
        },
      },
    });
  };

  const handleOpenDetail = (bookOrId) => {
    if (!onOpenDetail) return;
    if (typeof bookOrId === 'object' && bookOrId !== null) {
      const targetTitle = (bookOrId.title || '').trim();
      const targetId = bookOrId.book_id ?? bookOrId.bookId ?? bookOrId.id;
      const found = books.find(
        (b) =>
          (targetId && (b.bookId === targetId || b.id === String(targetId) || b.id === targetId)) ||
          normalizeTitle(b.title) === normalizeTitle(targetTitle) ||
          b.title.trim() === targetTitle
      );
      if (found) {
        onOpenDetail(found);
        return;
      }
    }
    onOpenDetail(bookOrId);
  };

  const sendQuery = async (message, targetLibrarianId = librarian.id, action = 'chat') => {
    // 이전 진행 중이던 스트리밍 요청이 있다면 abort
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setLastUserMessage(message);
    setTurnCount((c) => c + 1);

    const activeMode = chatMode;
    const isDebate = activeMode === 'debate';
    if (isDebate) {
      setDebateCollapsed(true);
    }

    // 사용자 질문을 해당 모드 대화 히스토리에 추가
    const userMsg = { role: 'user', text: message };
    setModeMessages((prev) => ({
      ...prev,
      [activeMode]: [...(prev[activeMode] || []), userMsg],
    }));

    // 질문 의도(인사/서재/추천/날씨/토론종료 등)에 따른 사서별 맥락 맞춤형 로딩 안내 멘트
    const initialLoadingMsg = getContextualLoadingMessage(message, targetLibrarianId);
    const initialAns = {
      text: initialLoadingMsg,
      library_books: [],
      libraryBooks: [],
      recommended_books: [],
      recommendedBooks: [],
    };
    setModeAnswers((prev) => ({ ...prev, [activeMode]: initialAns }));
    if (onAnswer) {
      onAnswer(initialAns);
    }

    // 날씨 연동을 위한 사용자 위치 (권한 거부/실패 시 null → 백엔드가 서울 기본값 사용)
    const location = await getUserLocation();

    if (controller.signal.aborted) return;

    // 실시간 SSE 스트리밍 연동: 첫 토큰 도착 전까지는 LoadingSequence(발바닥 로딩)를 유지하고,
    // 첫 토큰 도착 즉시 loading을 해제하고 말풍선 타이핑 스트리밍으로 자연스럽게 전환 (CLIAR-285)
    const activeSessionId = isDebate ? debateSessionId : chatSessionId;
    const currentSenderIcon = isDebate
      ? selectedDebatePersona?.icon || '💡'
      : librarian?.icon || '🐾';
    const currentSenderName = isDebate
      ? selectedDebatePersona?.name || '토론 파트너'
      : librarianNames[librarian?.id] || librarian?.displayName || librarian?.name || '사서';

    let hasReceivedFirstToken = false;

    const streamResult = await streamChatMessage({
      message,
      sessionId: activeSessionId,
      librarianId: targetLibrarianId,
      latitude: location?.latitude,
      longitude: location?.longitude,
      mode: isDebate ? 'debate' : 'chat',
      persona: isDebate ? debaterPersona : null,
      bookId: isDebate && selectedDebateBook ? (selectedDebateBook.bookId ?? selectedDebateBook.id) : null,
      topic: isDebate ? (selectedDebateBook ? selectedDebateBook.title : '자유 주제') : null,
      action,
      signal: controller.signal,
      onMetadata: (meta) => {
        if (controller.signal.aborted) return;
        if (meta?.session_id) {
          if (isDebate) {
            setDebateSessionId(meta.session_id);
          } else {
            setChatSessionId(meta.session_id);
          }
        }
        if (meta?.signals) {
          setModeAnswers((prev) => ({
            ...prev,
            [activeMode]: { ...(prev[activeMode] || {}), signals: meta.signals },
          }));
        }
      },
      onToken: (delta, accumulated) => {
        if (controller.signal.aborted) return;
        if (!hasReceivedFirstToken) {
          hasReceivedFirstToken = true;
          // 첫 토큰 도착 즉시 발바닥 로딩 해제 -> 말풍선 전환
          setLoading(false);
          const initialAssistantMsg = {
            role: 'assistant',
            text: accumulated,
            senderIcon: currentSenderIcon,
            senderName: currentSenderName,
            recommendedBooks: [],
            libraryBooks: [],
            isConcluded: false,
            debateSummary: null,
            signals: null,
            switchTo: null,
          };
          setModeMessages((prev) => ({
            ...prev,
            [activeMode]: [...(prev[activeMode] || []), initialAssistantMsg],
          }));
        } else {
          // 실시간 누적 텍스트 업데이트
          setModeMessages((prev) => {
            const list = prev[activeMode] || [];
            if (list.length === 0) return prev;
            const updated = [...list];
            const last = { ...updated[updated.length - 1], text: accumulated };
            updated[updated.length - 1] = last;
            return { ...prev, [activeMode]: updated };
          });
        }
        setModeAnswers((prev) => ({
          ...prev,
          [activeMode]: { ...(prev[activeMode] || {}), text: accumulated },
        }));
      },
      onBooks: (curatedBooks) => {
        if (controller.signal.aborted) return;
        setModeAnswers((prev) => ({
          ...prev,
          [activeMode]: {
            ...(prev[activeMode] || {}),
            recommendedBooks: curatedBooks,
            recommended_books: curatedBooks,
          },
        }));
        setModeMessages((prev) => {
          const list = prev[activeMode] || [];
          if (list.length === 0) return prev;
          const updated = [...list];
          const last = { ...updated[updated.length - 1], recommendedBooks: curatedBooks };
          updated[updated.length - 1] = last;
          return { ...prev, [activeMode]: updated };
        });
      },
      onSwitchSuggestion: (suggestion) => {
        if (controller.signal.aborted) return;
        setModeAnswers((prev) => ({
          ...prev,
          [activeMode]: {
            ...(prev[activeMode] || {}),
            switchTo: suggestion,
          },
        }));
        setModeMessages((prev) => {
          const list = prev[activeMode] || [];
          if (list.length === 0) return prev;
          const updated = [...list];
          const last = { ...updated[updated.length - 1], switchTo: suggestion };
          updated[updated.length - 1] = last;
          return { ...prev, [activeMode]: updated };
        });
      },
    });

    if (controller.signal.aborted) {
      return;
    }
    if (abortControllerRef.current === controller) {
      abortControllerRef.current = null;
    }

    if (streamResult) {
      if (streamResult.sessionId) {
        if (isDebate) {
          setDebateSessionId(streamResult.sessionId);
        } else {
          setChatSessionId(streamResult.sessionId);
        }
      }
      const newAnswer = {
        text: streamResult.text,
        switchTo: streamResult.switchTo,
        signals: streamResult.signals,
        libraryBooks: isDebate ? [] : (streamResult.libraryBooks || []),
        library_books: isDebate ? [] : (streamResult.library_books || []),
        recommendedBooks: streamResult.recommendedBooks || [],
        recommended_books: streamResult.recommended_books || [],
        isConcluded: Boolean(streamResult.isConcluded),
        is_concluded: Boolean(streamResult.is_concluded),
        debateSummary: streamResult.debateSummary || null,
        debate_summary: streamResult.debate_summary || null,
      };
      setModeAnswers((prev) => ({ ...prev, [activeMode]: newAnswer }));

      // 만약 토큰 콜백이 실행되지 않은 채 done으로 바로 끝난 경우(예: 빈 텍스트 or 단일 응답)
      if (!hasReceivedFirstToken) {
        const assistantMsg = {
          role: 'assistant',
          text: newAnswer.text,
          senderIcon: currentSenderIcon,
          senderName: currentSenderName,
          recommendedBooks: newAnswer.recommendedBooks,
          libraryBooks: newAnswer.libraryBooks,
          isConcluded: newAnswer.isConcluded,
          debateSummary: newAnswer.debateSummary,
          signals: newAnswer.signals,
          switchTo: newAnswer.switchTo,
        };
        setModeMessages((prev) => ({
          ...prev,
          [activeMode]: [...(prev[activeMode] || []), assistantMsg],
        }));
      } else {
        // 이미 생성된 마지막 assistant 메시지에 최종 메타데이터(isConcluded, debateSummary, signals 등) 동기화
        setModeMessages((prev) => {
          const list = prev[activeMode] || [];
          if (list.length === 0) return prev;
          const updated = [...list];
          const last = {
            ...updated[updated.length - 1],
            text: newAnswer.text,
            isConcluded: newAnswer.isConcluded,
            debateSummary: newAnswer.debateSummary,
            signals: newAnswer.signals,
            switchTo: newAnswer.switchTo,
            recommendedBooks: newAnswer.recommendedBooks,
          };
          updated[updated.length - 1] = last;
          return { ...prev, [activeMode]: updated };
        });
      }

      if (onAnswer) {
        onAnswer(newAnswer);
      }
    } else {
      // 백엔드 연결 실패 시에만 로컬 서재 검색으로 폴백
      const localResult = answerQuestion({ text: message, books, librarian, librarianNames });
      setModeAnswers((prev) => ({ ...prev, [activeMode]: localResult }));

      const assistantMsg = {
        role: 'assistant',
        text: localResult.text,
        senderIcon: currentSenderIcon,
        senderName: currentSenderName,
        recommendedBooks: localResult.recommendedBooks || localResult.recommended_books || [],
        libraryBooks: isDebate ? [] : (localResult.libraryBooks || localResult.library_books || []),
        isConcluded: false,
        debateSummary: null,
        signals: null,
        switchTo: null,
      };
      setModeMessages((prev) => ({
        ...prev,
        [activeMode]: [...(prev[activeMode] || []), assistantMsg],
      }));
      if (onAnswer) {
        onAnswer(localResult);
      }
    }

    setLoading(false);
  };

  const handleConcludeDebate = async () => {
    if (loading) return;
    const personaObj = DEBATE_PERSONAS.find((p) => p.id === debaterPersona);
    const personaName = personaObj?.name || '토론 파트너';
    const bookTitleStr = selectedDebateBook ? `《${selectedDebateBook.title}》` : '오늘 나눈 주제';

    const concludePrompt = `${personaName}님, ${bookTitleStr}에 대한 토론을 여기서 마무리하고 총평과 함께 이어 읽으면 좋을 책을 추천해 주세요.`;
    await sendQuery(concludePrompt, librarian.id, 'conclude');
  };

  /**
   * [✨ 새 대화] 세션 및 화면 초기화
   * - 사서(추천) 모드: 턴 수 무관 즉시 새 대화 리셋
   * - 토론 모드: 미마무리(!isConcluded) 및 유저 발화 2회 이상 시 confirm 확인 후 리셋
   * - 진행 중인 스트리밍 즉시 취소 (유령 답변 방지)
   * - crypto.randomUUID()로 새 sessionId 발급 및 sessionStorage 동기화
   * - 메시지 배열 및 도서 카드/턴 상태 초기화
   */
  const handleNewChat = () => {
    // 토론 모드 미마무리 확인창 (유저 발화 2턴 이상 조건)
    if (chatMode === 'debate') {
      const debateUserCount = (modeMessages.debate || []).filter((m) => m.role === 'user').length;
      const isConcluded = Boolean(modeAnswers.debate?.isConcluded || modeAnswers.debate?.is_concluded);

      if (!isConcluded && debateUserCount >= 2) {
        const confirmed = window.confirm(
          '진행 중인 토론을 마무리하지 않고 새 대화를 시작하시겠습니까?\n(현재 토론 내용은 저장되지 않습니다)'
        );
        if (!confirmed) {
          return;
        }
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);

    const newSessionId = generateSessionId();

    if (chatMode === 'debate') {
      setDebateSessionId(newSessionId);
      setDebateStep('debater');
      setSelectedDebateBook(null);
      setDebateBookQuery('');
      setDebateCollapsed(false);
    } else {
      setChatSessionId(newSessionId);
    }

    setModeAnswers({
      chat: null,
      debate: null,
      library: null,
    });
    setModeMessages({
      chat: [],
      debate: [],
      library: [],
    });
    setLastUserMessage('');
    setTurnCount(0);
    setInput('');

    const targetId = activeLibIdRef.current || librarian?.id;
    if (targetId) {
      saveChatSessionByLibrarian(targetId, {
        answer: null,
        messages: [],
        sessionId: newSessionId,
        lastUserMessage: '',
        open: true,
      });
    }

    if (onAnswer) {
      onAnswer(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    await sendQuery(message, librarian.id);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    dragInfoRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: fabPos?.x ?? (window.innerWidth - 68),
      initialY: fabPos?.y ?? (window.innerHeight - 190),
      hasMoved: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 무시
    }
  };

  const handlePointerMove = (e) => {
    if (!dragInfoRef.current.isDragging) return;
    const dx = e.clientX - dragInfoRef.current.startX;
    const dy = e.clientY - dragInfoRef.current.startY;
    if (Math.hypot(dx, dy) > 6) {
      dragInfoRef.current.hasMoved = true;
    }
    if (dragInfoRef.current.hasMoved) {
      const nextX = dragInfoRef.current.initialX + dx;
      const nextY = dragInfoRef.current.initialY + dy;
      setFabPos(getClampPos(nextX, nextY));
    }
  };

  const handlePointerUp = (e) => {
    if (!dragInfoRef.current.isDragging) return;
    dragInfoRef.current.isDragging = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // 무시
    }

    if (!dragInfoRef.current.hasMoved) {
      setOpen(true);
    }
  };

  // 닫힌 상태 (open === false)
  if (!open) {
    if (isMobile) {
      return (
        <button
          type="button"
          className="lc-mobile-fab"
          style={{
            position: 'fixed',
            left: fabPos?.x ?? (window.innerWidth - 68),
            top: fabPos?.y ?? (window.innerHeight - 190),
            zIndex: 85,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="사서에게 질문하기 (드래그하여 이동 가능)"
          title="사서에게 질문하기 (터치하여 열기, 드래그하여 이동)"
        >
          <img
            src={librarian?.logoImage || `/logo/logo_${librarian?.id || 'cat'}.png`}
            alt="DPYB 로고"
            className="lc-mobile-fab-logo"
            width={34}
            height={34}
            decoding="async"
            draggable={false}
          />
          <span className="lc-mobile-fab-badge" aria-hidden="true">
            {librarian.icon || '🐾'}
          </span>
        </button>
      );
    }

    return (
      <div
        style={{
          position: 'fixed',
          right: 'min(16px, 2vw)',
          bottom: 'min(16px, 2vh)',
          zIndex: 20,
          fontSize: 17,
        }}
      >
        <button
          onClick={() => setOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 999,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 22 }}>{librarian.icon}</span>
          사서에게 질문하기
        </button>
      </div>
    );
  }

  // 열린 상태 (open === true)
  const panelStyle = isMobile
    ? {
        position: 'fixed',
        bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
        left: 10,
        right: 10,
        maxWidth: 440,
        margin: '0 auto',
        zIndex: 95,
        minHeight: 'min(420px, calc(100vh - 140px))',
        maxHeight: 'min(640px, calc(100vh - 140px))',
        background: 'var(--bubble-bg)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        color: 'var(--text-h)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        position: 'fixed',
        right: 'min(16px, 2vw)',
        bottom: 'min(16px, 2vh)',
        zIndex: 20,
        width: 'min(340px, calc(100vw - 32px))',
        fontSize: 17,
        background: 'var(--bubble-bg)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        color: 'var(--text-h)',
        height: 'auto',
        minHeight: 'min(460px, calc(100vh - 173px))',
        maxHeight: 'min(700px, calc(100vh - 173px))',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      };

  return (
    <div style={panelStyle} className="lc-chat-panel">
      {/* 1. 최상단 헤더: 사서 이름 + [✨ 새 대화] + 모드별 도움말 (?) + 닫기 (✕) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 4 }}>
          {librarian.icon} {librarian.displayName || librarian.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* ✨ 새 대화 버튼 */}
          <button
            type="button"
            className="lc-new-chat-btn"
            onClick={handleNewChat}
            title="현재 대화를 비우고 새로운 세션으로 대화를 시작합니다"
          >
            ✨ 새 대화
          </button>
          {/* 모드별 맞춤 도움말 (?) 툴팁 - 상단 고정 */}
          <div onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)} style={{ position: 'relative' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 12,
                cursor: 'help',
                userSelect: 'none',
              }}
            >
              ?
            </span>
            {showHelp && (
              <div
                style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: chatMode === 'debate' ? 260 : 230,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 10,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                  lineHeight: 1.5,
                  fontSize: 12,
                  zIndex: 50,
                }}
              >
                {chatMode === 'chat' && (
                  <>
                    <strong>💬 추천 대화 가이드</strong>
                    <br />· 따뜻하고 힐링되는 소설 추천해줘
                    <br />· 오늘 날씨에 어울리는 책 있어?
                    <br />· 아몬드라는 책 어때?
                  </>
                )}
                {chatMode === 'library' && (
                  <>
                    <strong>📚 AI 서재 검색 가이드</strong>
                    <br />· 상단: 제목/저자 빠른 필터
                    <br />· 하단: AI 자연어 질의
                    <br /><em>(예: "읽고 있는 책 보여줘")</em>
                  </>
                )}
                {chatMode === 'debate' && (
                  <>
                    <strong>💡 4인 AI 독서 토론 가이드</strong>
                    <br />· <strong>평론가(이동진)</strong>: 미학·복선·화두
                    <br />· <strong>이야기꾼(설민석)</strong>: 시대 배경·교훈
                    <br />· <strong>상담사(오은영)</strong>: 인물 심리·공감
                    <br />· <strong>관찰가(강형욱)</strong>: 본능·행동 시그널
                  </>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>

      {/* 2. 모드 전환 탭: [ 📚 내 서재 | 💬 대화·추천 | 💡 사서 토론 ] */}
      <div className="lc-mode-tabs" style={{ flexShrink: 0 }}>
        <button
          type="button"
          className={`lc-mode-tab ${chatMode === 'library' ? 'active' : ''}`}
          onClick={() => {
            setChatMode('library');
            if (onAnswer) onAnswer(modeAnswers.library || null);
          }}
        >
          📚 내 서재
        </button>
        <button
          type="button"
          className={`lc-mode-tab ${chatMode === 'chat' ? 'active' : ''}`}
          onClick={() => {
            setChatMode('chat');
            if (onAnswer) onAnswer(modeAnswers.chat || null);
          }}
        >
          💬 대화·추천
        </button>
        <button
          type="button"
          className={`lc-mode-tab ${chatMode === 'debate' ? 'active' : ''}`}
          onClick={() => {
            setChatMode('debate');
            if (onAnswer) onAnswer(modeAnswers.debate || null);
          }}
        >
          💡 토론
        </button>
      </div>

      {/* 3. 상단 고정 날씨·시간대·무드 뱃지 (일반 대화 및 추천 모드에서만 고정 노출) */}
      {chatMode === 'chat' && currentAnswer?.signals && !loading && (
        <div style={{ flexShrink: 0, marginBottom: 4 }}>
          <WeatherMoodBadge signals={currentAnswer.signals} />
        </div>
      )}

      {/*
       * 3-1. 토론 대화 시작 후 상단 고정 배너 (사용자 요청, 2026-09).
       * 토론자/도서 선택 화면(debateCollapsed=false)에서는 카드만 보이고 이 배너는
       * 아예 렌더링하지 않는다. 첫 메시지를 보내면(handleSendMessage에서
       * setDebateCollapsed(true)) 이 배너가 나타나고, 스크롤 영역(lc-content-body)
       * 바깥에 있어 대화를 스크롤해도 항상 화면에 고정된다.
       */}
      {chatMode === 'debate' && debateCollapsed && (
        <div
          className="lc-debate-banner lc-debate-banner-clickable"
          style={{ flexShrink: 0, marginBottom: 8 }}
          onClick={() => {
            setDebateCollapsed(false);
            setDebateStep('topic');
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setDebateCollapsed(false);
              setDebateStep('topic');
            }
          }}
          title="토론 설정 펼치기"
        >
          <span className="lc-debate-badge">DEBATE</span>
          <span className="lc-debate-banner-title">
            {selectedDebatePersona.icon} <strong>{selectedDebatePersona.name}</strong> ·{' '}
            {selectedDebateBook ? `《${selectedDebateBook.title}》 토론 중` : '나만의 주제로 토론 중'}
          </span>
          <div className="lc-debate-banner-actions">
            <button
              type="button"
              className="lc-debate-mini-conclude-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleConcludeDebate();
              }}
              disabled={loading}
              title="토론 끝내기 및 맞춤 책 추천받기"
            >
              🏁 끝내기
            </button>
            <span className="lc-debate-banner-toggle">설정 ▾</span>
          </div>
        </div>
      )}

      {/* 스크롤 가능한 본문 영역 (헤더/탭과 하단 입력창 사이에서 내부 스크롤) */}
      <div
        className="lc-content-body"
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          marginBottom: 8,
          paddingRight: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 📚 모드 1: 내 서재 빠른 조회 모드 (Core API 데이터 기반 즉시 응답) */}
        {chatMode === 'library' && (
          <div className="lc-library-view">
            <input
              type="text"
              className="lc-library-search-input"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="내 서재 책 제목 또는 저자 검색..."
            />
            <div className="lc-library-filter-pills">
              <button
                type="button"
                className={`lc-library-pill ${libraryFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setLibraryFilter('ALL')}
              >
                전체 ({books.length})
              </button>
              <button
                type="button"
                className={`lc-library-pill ${libraryFilter === 'READING' ? 'active' : ''}`}
                onClick={() => setLibraryFilter('READING')}
              >
                읽는 중
              </button>
              <button
                type="button"
                className={`lc-library-pill ${libraryFilter === 'COMPLETED' ? 'active' : ''}`}
                onClick={() => setLibraryFilter('COMPLETED')}
              >
                완독
              </button>
              <button
                type="button"
                className={`lc-library-pill ${libraryFilter === 'PLANNED' ? 'active' : ''}`}
                onClick={() => setLibraryFilter('PLANNED')}
              >
                시작 전
              </button>
            </div>

            <div className="lc-library-list">
              {filteredLibraryBooks.length === 0 ? (
                <div className="lc-library-empty">
                  {libraryQuery.trim() ? '일치하는 책이 없습니다.' : '서재에 등록된 도서가 없습니다.'}
                </div>
              ) : (
                filteredLibraryBooks.map((b) => (
                  <div key={b.bookId || b.id} className="lc-library-item">
                    <div className="lc-library-item-info">
                      <span className="lc-library-item-title">{b.title}</span>
                      <div className="lc-library-item-meta">
                        {b.author && <span>{b.author}</span>}
                        <span className="lc-library-item-badge">{b.status}</span>
                        {b.progress != null && <span>{b.progress}%</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="lc-library-open-btn"
                      onClick={() => handleOpenDetail(b)}
                    >
                      책 열기 ➔
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/*
         * 💡 모드 2: 사서 토론 모드 단계별 설정.
         * - Step 1 ('debater'): AI 토론 파트너 4인 선택
         * - Step 2 ('topic'): '나만의 주제로 토론하기' 또는 '내 서재 도서' 선택
         * - 선택 완료 시 debateCollapsed=true로 전환되어 채팅창 진입
         */}
        {chatMode === 'debate' && !debateCollapsed && (
          <div className="lc-debate-view">
            {debateStep === 'debater' ? (
              /* [1단계] 토론 상대 선택 */
              <div className="lc-debate-step-box">
                <div className="lc-debate-step-header">
                  <span className="lc-debate-step-tag">1단계</span>
                  <label className="lc-debate-label">
                    토론 파트너 선택 (AI 전문 토론자 4인)
                  </label>
                </div>
                <div className="lc-debater-grid">
                  {DEBATE_PERSONAS.map((dp) => {
                    const isSelected = debaterPersona === dp.id;
                    return (
                      <button
                        key={dp.id}
                        type="button"
                        className={`lc-debater-card ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setDebaterPersona(dp.id);
                          setDebateStep('topic');
                        }}
                        disabled={loading}
                      >
                        <div className="lc-debater-header">
                          <span className="lc-debater-icon">{dp.icon}</span>
                          <span className="lc-debater-name">{dp.name}</span>
                          <span className="lc-debater-tag">{dp.tag}</span>
                        </div>
                        <span className="lc-debater-title">{dp.title}</span>
                        <span className="lc-debater-desc">{dp.oneLiner}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* [2단계] 토론 주제 및 도서 선택 */
              <div className="lc-debate-step-box">
                {/* 2단계 상단: 현재 선택된 토론자 표시 + 토론자 변경 버튼 */}
                <div className="lc-debate-partner-bar">
                  <div className="lc-debate-partner-bar-info">
                    <span className="lc-debater-icon">{selectedDebatePersona.icon}</span>
                    <strong className="lc-debate-partner-bar-name">{selectedDebatePersona.name}</strong>
                    <span className="lc-debate-partner-bar-title">({selectedDebatePersona.title})</span>
                  </div>
                  <button
                    type="button"
                    className="lc-debate-change-partner-btn"
                    onClick={() => setDebateStep('debater')}
                    title="다른 토론자로 변경"
                  >
                    파트너 변경 ↺
                  </button>
                </div>

                <div className="lc-debate-step-header">
                  <span className="lc-debate-step-tag">2단계</span>
                  <label className="lc-debate-label">
                    토론할 주제나 책을 선택해 주세요
                  </label>
                </div>

                {/* 최상단: 나만의 주제로 토론하기 (자유 주제) 버튼 */}
                <button
                  type="button"
                  className={`lc-debate-custom-topic-card ${selectedDebateBook === null ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDebateBook(null);
                    setDebateCollapsed(true);
                  }}
                  disabled={loading}
                >
                  <div className="lc-debate-custom-topic-main">
                    <span className="lc-debate-custom-topic-icon">✨</span>
                    <div className="lc-debate-custom-topic-text">
                      <span className="lc-debate-custom-topic-title">나만의 주제로 토론하기</span>
                      <span className="lc-debate-custom-topic-desc">
                        서재의 책 없이도 원하는 주제나 질문으로 자유롭게 대화해요
                      </span>
                    </div>
                  </div>
                  <span className="lc-debate-start-arrow">시작 ➔</span>
                </button>

                {/* 내 서재 도서 선택 섹션 */}
                <div className="lc-debate-book-section">
                  <div className="lc-debate-section-title">
                    <span>📖 또는 내 서재의 책으로 토론하기</span>
                    <span className="lc-debate-book-count">({books.length}권)</span>
                  </div>

                  {books.length > 2 && (
                    <input
                      type="text"
                      className="lc-debate-book-search-input"
                      value={debateBookQuery}
                      onChange={(e) => setDebateBookQuery(e.target.value)}
                      placeholder="서재 책 제목 또는 저자 검색..."
                    />
                  )}

                  <div className="lc-debate-book-list">
                    {books.length === 0 ? (
                      <div className="lc-debate-empty-books">
                        서재에 등록된 도서가 없습니다.
                        <br />
                        위의 <strong>'나만의 주제로 토론하기'</strong>를 눌러 바로 시작해 보세요!
                      </div>
                    ) : debateLibraryBooks.length === 0 ? (
                      <div className="lc-debate-empty-books">
                        일치하는 서재 도서가 없습니다.
                      </div>
                    ) : (
                      debateLibraryBooks.map((b) => {
                        const bookId = b.bookId || b.id;
                        const isChosen = selectedDebateBook && (selectedDebateBook.bookId === bookId || selectedDebateBook.id === bookId);
                        return (
                          <div
                            key={bookId}
                            className={`lc-debate-book-item ${isChosen ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedDebateBook(b);
                              setDebateCollapsed(true);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedDebateBook(b);
                                setDebateCollapsed(true);
                              }
                            }}
                          >
                            <div className="lc-debate-book-info">
                              <span className="lc-debate-book-title">{b.title}</span>
                              <div className="lc-debate-book-meta">
                                {b.author && <span>{b.author}</span>}
                                {b.status && <span className="lc-debate-book-badge">{b.status}</span>}
                                {b.progress != null && <span>{b.progress}%</span>}
                              </div>
                            </div>
                            <span className="lc-debate-book-select-action">선택 ➔</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 대화 히스토리가 이미 있는 상태에서 설정을 펼쳤을 때: '대화로 돌아가기' 버튼 */}
                {(modeAnswers?.debate?.text || modeMessages?.debate?.length > 0) && (
                  <button
                    type="button"
                    className="lc-debate-return-btn"
                    onClick={() => setDebateCollapsed(true)}
                  >
                    대화창으로 돌아가기 ▾
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 사서 소개 팁 안내 (전문 장르 벗어난 추천 질문 시 부드럽게 안내) */}
        {chatMode !== 'library' && currentAnswer?.switchTo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              marginBottom: 8,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--accent-border)',
              background: 'var(--accent-bg)',
              color: 'var(--text-h)',
              fontSize: 13,
              lineHeight: 1.4,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 18 }}>💡</span>
            <span>
              이 장르는 <strong>{targetSwitchName}</strong>가 더 깊이 있게 추천할 수 있어요. 상단 프로필에서 언제든 사서를 변경해 보세요!
            </span>
          </div>
        )}

        {/* 🧠 토론 기억 저장 완료 뱃지 (피날레 시 백엔드 agent.debate_insights 자동 저장 연계) */}
        {isConcluded && !loading && (
          <div className="lc-debate-concluded-badge">
            <span className="lc-debate-concluded-icon">🧠</span>
            <div className="lc-debate-concluded-text">
              <strong>토론 인사이트가 서재 기억에 저장되었습니다</strong>
              {debateSummary ? (
                <span className="lc-debate-concluded-summary">"{debateSummary}"</span>
              ) : (
                <span>다음 대화에서도 사서가 오늘 나눈 통찰을 기억합니다.</span>
              )}
            </div>
          </div>
        )}

        {/* 💬 메신저형 멀티턴 대화 히스토리 리스트 */}
        <div className="lc-messages-list">
          {currentMessages.map((msg, mIdx) => {
            const isUser = msg.role === 'user';
            const isLastAssistant = !isUser && mIdx === currentMessages.length - 1;
            const msgRecommended = isLastAssistant ? recommendedBooks : (msg.recommendedBooks || []);

            return (
              <div key={mIdx} className={`lc-message-row ${isUser ? 'user' : 'assistant'}`}>
                <div className="lc-message-sender">
                  {isUser
                    ? '👤 나'
                    : msg.senderName
                      ? `${msg.senderIcon || ''} ${msg.senderName}`.trim()
                      : chatMode === 'debate'
                        ? `${selectedDebatePersona.icon} ${selectedDebatePersona.name}`
                        : `${librarian.icon} ${librarianNames[librarian.id] || librarian.displayName || librarian.name}`}
                </div>
                <div className="lc-message-bubble">
                  {isUser ? (
                    msg.text
                  ) : (
                    <MarkdownRenderer
                      text={msg.text}
                      recommendedBooks={msgRecommended}
                      libraryBooks={books}
                      onRegister={handleRegisterBook}
                      onOpenDetail={handleOpenDetail}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/*
           * 로딩 중일 때 순차 로딩 애니메이션과 안내 문구 표시 (CLIAR-285).
           * 예전엔 메시지 목록(lc-messages-list) 위쪽에 있어서, 대화가 쌓일수록 로딩
           * 표시가 스크롤 위로 밀려 안 보이는 문제가 있었다(사용자 요청, 2026-09).
           * 메시지 목록 맨 끝(방금 보낸 질문 바로 다음)에 배치해 자동 스크롤이 항상
           * 여기까지 따라오도록 옮겼다.
           */}
          {loading && (
            <div
              style={{
                marginBottom: 8,
                background: 'var(--code-bg)',
                borderRadius: 10,
                border: '1px solid var(--border)',
              }}
            >
              <LoadingSequence
                size={120}
                padding={20}
                label={
                  turnCount <= 1 ? (
                    <>
                      따스한 햇살 아래 포근히 잠든{' '}
                      <strong>{librarianNames[librarian.id] || librarian.name} 사서</strong>를 살며시 깨우고 있어요...
                    </>
                  ) : isBookRecommendationQuery(lastUserMessage) ? (
                    getRecommendationLoadingMessage(librarian.id)
                  ) : (
                    // 2번째 질문부터 추천 질문이 아니면 로딩 애니메이션만 표시 (CLIAR-285)
                    ''
                  )
                }
              />
            </div>
          )}
        </div>

        {/* 1. 내 서재 도서 목록 카드 (일반 대화 및 서재 모드에서만 노출, 토론 모드에서는 제외) */}
        {chatMode !== 'debate' && libraryBooks.length > 0 && !loading && !currentAnswer?.text?.includes('### 📚') && (
          <div
            style={{
              marginBottom: 10,
              padding: '8px 10px',
              background: 'var(--code-bg)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              maxHeight: 160,
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              📖 내 서재 도서 ({libraryBooks.length}권):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {libraryBooks.map((b, idx) => {
                const bookId = b.book_id ?? b.bookId ?? b.id;
                const statusKr = toKoreanStatus(b.reading_status ?? b.readingStatus ?? b.status, b.progress ?? 0);
                const progress = b.progress != null ? `${b.progress}%` : null;
                return (
                  <div
                    key={bookId || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      padding: '6px 8px',
                      background: 'var(--bg)',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>{b.title}</span>
                      {b.author && <span style={{ fontSize: 15, color: 'var(--text)', marginLeft: 4 }}>({b.author})</span>}
                      {(statusKr || progress) && (
                        <span style={{ fontSize: 14, color: 'var(--accent)', marginLeft: 6, fontWeight: 500 }}>
                          [{statusKr}{progress ? ` · ${progress}` : ''}]
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(b)}
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--accent-border, var(--accent))',
                        background: 'var(--accent-bg, rgba(0, 229, 255, 0.1))',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      책 열기 ➔
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. 추천 도서 바로 등록 카드 리스트 (마크다운 본문에 ### 📖 카드가 없는 JSON 응답 대응) */}
        {recommendedBooks.length > 0 && !loading && !currentAnswer?.text?.includes('### 📖') && (
          <div
            style={{
              marginBottom: 10,
              padding: '8px 10px',
              background: 'var(--code-bg)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              maxHeight: 160,
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              📚 추천 도서 바로 서재에 등록하기:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recommendedBooks.map((b, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                    padding: '6px 8px',
                    background: 'var(--bg)',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{b.title}</span>
                    {b.author && <span style={{ fontSize: 15, color: 'var(--text)', marginLeft: 4 }}>({b.author})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRegisterBook(b)}
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--accent-border, var(--accent))',
                      background: 'var(--accent)',
                      color: '#fff',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    등록 ➔
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 자동 스크롤 타깃 엘리먼트 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력창 (내 서재 자연어 질의, 대화·추천, 토론 모드 공통 지원) */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={
              loading
                ? (chatMode === 'debate' ? '토론 답변을 생각하는 중...' : '답변을 생각하는 중...')
                : chatMode === 'debate'
                  ? selectedDebateBook
                    ? `${selectedDebatePersona.name}에게 《${selectedDebateBook.title}》에 대한 생각이나 질문을 던져보세요`
                    : `${selectedDebatePersona.name}에게 나누고 싶은 생각이나 토론 주제를 던져보세요`
                  : chatMode === 'library'
                    ? '내 서재에 대해 자연어로 물어보세요 (예: 읽고 있는 책 보여줘)'
                    : '무엇이든 물어보세요 (추천·검색·날씨 등)'
            }
            disabled={loading}
            // CLIAR-301: 질문 입력창도 답변 박스와 같은 표면(배경·테두리)을 공유
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--answer-border)', background: 'var(--answer-bg)', color: 'var(--text-h)', opacity: loading ? 0.6 : 1 }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            ↵
          </button>
        </div>
        {/* 백엔드 max_length(2000자)에 근접했을 때만 카운터를 노출해 평소엔 UI가 조용하게 유지 */}
        {input.length > MAX_MESSAGE_LENGTH * 0.8 && (
          <span
            style={{
              alignSelf: 'flex-end',
              fontSize: 15,
              color: input.length >= MAX_MESSAGE_LENGTH ? '#e05a4e' : 'var(--text)',
            }}
          >
            {input.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </form>
    </div>
  );
}

