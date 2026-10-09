import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../../store/booksStore';
import { answerQuestion } from './chatEngine';
import { streamChatMessage } from '../../api/chatApi';
import { getUserLocation } from '../../api/geolocation';
import { formatRecommendedBooks, extractLibraryBooksFromAnswer, getColorIndex, getBookThickness } from './bookExtractor';
import {
  useLibrarian,
  loadSavedChatSessionByLibrarian,
  saveChatSessionByLibrarian,
} from '../../store/librarianStore';
import { useAuth } from '../../store/authStore';
import { DEBATE_PERSONAS } from '../../data/debatePersonas';
import { LIBRARIANS } from '../../data/librarians';
import { useTheme } from '../../store/themeStore';
import WeatherMoodBadge from './WeatherMoodBadge';
import ChatHeader from './chat/ChatHeader';
import ChatModeTabs from './chat/ChatModeTabs';
import DebateSetupSection from './chat/DebateSetupSection';
import ChatMessageList from './chat/ChatMessageList';
import ChatBookCards from './chat/ChatBookCards';
import ChatInputForm from './chat/ChatInputForm';
import MobileChatFAB from './chat/MobileChatFAB';
import { useResponsive } from '../../hooks/useResponsive';
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
 * LibrarianChat — 오른쪽 하단 질문 입력 패널 및 사서 인터랙션.
 */
export default function LibrarianChat({ librarian, answer, onAnswer, onOpenDetail, onLoadingChange, onOpenTimer }) {
  const { books } = useBooks();
  const { names: librarianNames } = useLibrarian();
  const { theme, setTheme } = useTheme();
  const { member, isGuest } = useAuth();
  const currentUserId = isGuest ? 'guest' : (member?.member_id || member?.id || member?.sub || member?.email || 'user');
  const navigate = useNavigate();

  // CLIAR-257: 추천 도서 등록 후 뒤로가기 시 대화/추천 카드 복원
  const [open, setOpen] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id, currentUserId, 'chat');
    if (saved?.open !== undefined) return saved.open;
    return Boolean(answer?.text);
  });

  // 디스플레이 규격 및 반응형 UX (스마트폰 ~ 대형 태블릿 통합)
  const { isUnifiedMobileUX: isMobile } = useResponsive();

  // 모바일 사서 플로팅 버튼 클릭 시 미니 메뉴(사서 변경 / 사서와 대화하기 / 독서 타이머) 팝업 상태
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 모바일 FAB 위치 상태 (x, y)
  const [fabPos, setFabPos] = useState(null);
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    elemStartX: 0,
    elemStartY: 0,
    hasMoved: false,
  });

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clickMotion, setClickMotion] = useState(false);

  // 대화 모드: 'chat'(일반 대화 및 도서 추천) | 'debate'(AI 독서 토론) | 'library'(내 서재 조회)
  const [chatMode, setChatMode] = useState('chat');

  // 토론 설정 단계: 'debater'(1단계: 토론 상대 4인 선택) | 'topic'(2단계: 주제/책 선택)
  const [debateStep, setDebateStep] = useState('debater');

  // 💡 사서 토론 모드 상태: 4인 전문 파트너 페르소나 ('critic' | 'storyteller' | 'counselor' | 'observer')
  const [debaterPersona, setDebaterPersona] = useState('critic');

  // 토론 대상 도서 (null이면 '나만의 주제로 토론하기' 자유 토론 모드)
  const [selectedDebateBook, setSelectedDebateBook] = useState(null);

  // 토론 진행 중 상단 설정 카드 접힘 여부
  const [debateCollapsed, setDebateCollapsed] = useState(false);

  // 서재 책 검색어 (토론 모드 2단계용)
  const [debateBookQuery, setDebateBookQuery] = useState('');

  // 📚 내 서재 조회 모드 상태
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('ALL');

  // 사서별 & 모드별 독립 대화 세션 및 메시지 히스토리 관리
  const [modeSessions, setModeSessions] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id, currentUserId, 'chat');
    return {
      chat: saved?.sessionId || generateSessionId(),
      debate: generateSessionId(),
      library: generateSessionId(),
    };
  });

  const chatSessionId = modeSessions.chat;
  const debateSessionId = modeSessions.debate;

  const setChatSessionId = useCallback((newId) => {
    setModeSessions((prev) => ({ ...prev, chat: newId }));
  }, []);

  const setDebateSessionId = useCallback((newId) => {
    setModeSessions((prev) => ({ ...prev, debate: newId }));
  }, []);

  // 모드별 메시지 히스토리 분리
  const [modeMessages, setModeMessages] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id, currentUserId, 'chat');
    const initialChatMessages = [];
    if (saved?.messages && Array.isArray(saved.messages) && saved.messages.length > 0) {
      initialChatMessages.push(...saved.messages);
    } else if (answer?.text) {
      initialChatMessages.push({
        role: 'assistant',
        text: answer.text,
        senderIcon: '🐾',
        senderName: librarianNames[librarian?.id] || librarian?.displayName || librarian?.name || '사서',
        recommendedBooks: answer.recommended_books || answer.recommendedBooks || [],
        libraryBooks: answer.library_books || answer.libraryBooks || [],
        isConcluded: false,
        debateSummary: null,
        signals: answer.signals || null,
        switchTo: answer.switchTo || null,
      });
    }
    return {
      chat: initialChatMessages,
      debate: [],
      library: [],
    };
  });

  // 모드별 최신 답변 객체 캐시
  const [modeAnswers, setModeAnswers] = useState(() => {
    const saved = loadSavedChatSessionByLibrarian(librarian?.id, currentUserId, 'chat');
    const initialChatAnswer = saved?.answer || answer || null;
    return {
      chat: initialChatAnswer,
      debate: null,
      library: null,
    };
  });

  // 모드별 질문 턴 수 (대화 깊이 측정)
  const [modeTurnCounts, setModeTurnCounts] = useState({
    chat: 0,
    debate: 0,
    library: 0,
  });

  const turnCount = modeTurnCounts[chatMode] || 0;
  const setTurnCount = useCallback((valOrFn) => {
    setModeTurnCounts((prev) => {
      const cur = prev[chatMode] || 0;
      const next = typeof valOrFn === 'function' ? valOrFn(cur) : valOrFn;
      return { ...prev, [chatMode]: next };
    });
  }, [chatMode]);

  // 모드별 마지막 사용자 질문
  const [modeLastUserMessages, setModeLastUserMessages] = useState({
    chat: '',
    debate: '',
    library: '',
  });

  const lastUserMessage = modeLastUserMessages[chatMode] || '';
  const setLastUserMessage = useCallback((text) => {
    setModeLastUserMessages((prev) => ({ ...prev, [chatMode]: text }));
  }, [chatMode]);

  // 토론 완료 여부 및 총평 상태
  const [modeSummaries, setModeSummaries] = useState({
    debate: { isConcluded: false, summary: null },
  });

  // 현재 모드의 메시지 목록 및 답변
  const currentMessages = useMemo(() => modeMessages[chatMode] || [], [modeMessages, chatMode]);
  const currentAnswer = modeAnswers[chatMode] || null;
  const isConcluded = chatMode === 'debate' ? modeSummaries.debate.isConcluded : false;
  const debateSummary = chatMode === 'debate' ? modeSummaries.debate.summary : null;

  // 데스크톱 전환 시 모바일 미니 메뉴 닫기
  useEffect(() => {
    if (!isMobile) {
      setShowMobileMenu(false);
    }
  }, [isMobile]);

  // 모바일 FAB 드래그 앤 드롭 핸들러
  const handleFabPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const btnElem = e.currentTarget.parentElement;
    const rect = btnElem.getBoundingClientRect();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      elemStartX: rect.left,
      elemStartY: rect.top,
      hasMoved: false,
    };
    window.addEventListener('pointermove', handleFabPointerMove);
    window.addEventListener('pointerup', handleFabPointerUp);
    window.addEventListener('pointercancel', handleFabPointerUp);
  };

  const handleFabPointerMove = (e) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.hasMoved = true;
    }
    const newX = Math.max(10, Math.min(window.innerWidth - 65, dragRef.current.elemStartX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 65, dragRef.current.elemStartY + dy));
    setFabPos({ x: newX, y: newY });
  };

  const handleFabPointerUp = () => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;
    window.removeEventListener('pointermove', handleFabPointerMove);
    window.removeEventListener('pointerup', handleFabPointerUp);
    window.removeEventListener('pointercancel', handleFabPointerUp);

    // 드래그하지 않고 가볍게 탭/클릭한 경우: 모바일 미니 메뉴 토글
    if (!dragRef.current.hasMoved) {
      setShowMobileMenu((prev) => !prev);
      setClickMotion(true);
      setTimeout(() => setClickMotion(false), 500);
    }
  };

  // 선택된 토론 파트너 객체
  const selectedDebatePersona = useMemo(() => {
    return DEBATE_PERSONAS.find((p) => p.id === debaterPersona) || DEBATE_PERSONAS[0];
  }, [debaterPersona]);

  // 사서 전환 팁 제안 대상 사서
  const targetSwitchName = useMemo(() => {
    const targetId = currentAnswer?.switchTo;
    if (!targetId) return '';
    return LIBRARIANS[targetId]?.name || targetId;
  }, [currentAnswer?.switchTo]);

  // 추천 도서 목록 추출
  const backendRecommendedBooks = currentAnswer?.recommended_books || currentAnswer?.recommendedBooks || [];
  const recommendedBooks = useMemo(() => {
    if (currentAnswer?.recommended_books && Array.isArray(currentAnswer.recommended_books) && currentAnswer.recommended_books.length > 0) {
      return currentAnswer.recommended_books;
    }
    if (currentAnswer?.recommendedBooks && Array.isArray(currentAnswer.recommendedBooks) && currentAnswer.recommendedBooks.length > 0) {
      return currentAnswer.recommendedBooks;
    }
    if (currentAnswer?.text) {
      return formatRecommendedBooks(currentAnswer.text);
    }
    return [];
  }, [currentAnswer]);

  // 내 서재 도서 목록 추출
  const libraryBooks = useMemo(() => {
    if (currentAnswer?.library_books && Array.isArray(currentAnswer.library_books) && currentAnswer.library_books.length > 0) {
      return currentAnswer.library_books;
    }
    if (currentAnswer?.libraryBooks && Array.isArray(currentAnswer.libraryBooks) && currentAnswer.libraryBooks.length > 0) {
      return currentAnswer.libraryBooks;
    }
    if (currentAnswer?.text) {
      return extractLibraryBooksFromAnswer(currentAnswer.text, books);
    }
    return [];
  }, [currentAnswer, books]);

  // 내 서재 빠른 조회 모드 필터링 목록
  const filteredLibraryBooks = useMemo(() => {
    let list = books;
    if (libraryFilter === 'READING') list = list.filter((b) => b.status === '읽는중' || b.status === '읽는 중');
    else if (libraryFilter === 'COMPLETED') list = list.filter((b) => b.status === '완독');
    else if (libraryFilter === 'PLANNED') list = list.filter((b) => b.status === '시작전' || b.status === '시작 전');

    if (libraryQuery.trim()) {
      const q = libraryQuery.trim().toLowerCase();
      list = list.filter(
        (b) =>
          (b.title && b.title.toLowerCase().includes(q)) ||
          (b.author && b.author.toLowerCase().includes(q))
      );
    }
    return list;
  }, [books, libraryFilter, libraryQuery]);

  // 토론 모드 2단계용 서재 도서 검색 목록
  const debateLibraryBooks = useMemo(() => {
    if (!debateBookQuery.trim()) return books;
    const q = debateBookQuery.trim().toLowerCase();
    return books.filter(
      (b) =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q))
    );
  }, [books, debateBookQuery]);

  // 새 대화 시작 (세션 초기화)
  const handleNewChat = () => {
    if (chatMode === 'debate' && turnCount >= 2 && !isConcluded) {
      const confirmReset = window.confirm(
        '토론을 아직 마무리하지 않았습니다. 새 대화를 시작하면 현재 토론 내용이 초기화됩니다. 계속하시겠습니까?'
      );
      if (!confirmReset) return;
    }

    const newId = generateSessionId();
    if (chatMode === 'debate') {
      setDebateSessionId(newId);
      setDebateStep('debater');
      setDebateCollapsed(false);
      setSelectedDebateBook(null);
      setModeSummaries((prev) => ({ ...prev, debate: { isConcluded: false, summary: null } }));
    } else {
      setChatSessionId(newId);
    }

    setModeMessages((prev) => ({ ...prev, [chatMode]: [] }));
    setModeAnswers((prev) => ({ ...prev, [chatMode]: null }));
    setTurnCount(0);
    setLastUserMessage('');
    if (onAnswer) onAnswer(null);

    // 사서별 세션 스토리지 초기화
    saveChatSessionByLibrarian(librarian?.id, {
      answer: null,
      messages: [],
      sessionId: newId,
      lastUserMessage: '',
      open: true,
    }, currentUserId, chatMode);
  };

  // 🏁 독서 토론 마무리 요청
  const handleConcludeDebate = () => {
    if (loading) return;
    const persona = selectedDebatePersona.name;
    const bookTitle = selectedDebateBook ? `《${selectedDebateBook.title}》` : '오늘 나눈 주제';
    const conclusionPrompt = `${persona}님, 지금까지 나눈 ${bookTitle}에 대한 토론을 총평 및 결론으로 깔끔하게 마무리해 주시고, 앞으로 읽어보면 좋을 맞춤 도서를 추천해 주세요.`;
    handleSendMessage(conclusionPrompt, 'conclude');
  };

  const handleRegisterBook = (book) => {
    const matchedBook = backendRecommendedBooks.find(
      (b) =>
        (b.title || '').trim() === (book.title || '').trim() ||
        normalizeTitle(b.title) === normalizeTitle(book.title)
    );

    const title = (matchedBook?.title || book.title || '').trim();
    const author = (matchedBook?.author ?? book.author ?? '').trim();
    const pageCount =
      typeof matchedBook?.page_count === 'number' && Number.isFinite(matchedBook.page_count)
        ? matchedBook.page_count
        : typeof book.page_count === 'number' && Number.isFinite(book.page_count)
          ? book.page_count
          : typeof book.totalPage === 'number' && Number.isFinite(book.totalPage)
            ? book.totalPage
            : null;
    const genre = matchedBook?.genre || book.genre || undefined;

    saveChatSessionByLibrarian(librarian?.id, {
      answer: modeAnswers.chat || currentAnswer,
      messages: modeMessages.chat,
      sessionId: chatSessionId,
      lastUserMessage,
      open: true,
    }, currentUserId, 'chat');

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

    const userMsg = { role: 'user', text: message };
    setModeMessages((prev) => ({
      ...prev,
      [activeMode]: [...(prev[activeMode] || []), userMsg],
    }));

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

    try {
      const location = await getUserLocation();

      if (controller.signal.aborted) return;

      const activeSessionId = isDebate ? debateSessionId : chatSessionId;
      const currentSenderIcon = isDebate
        ? selectedDebatePersona?.icon || '💡'
        : '🐾';
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
        bookId: isDebate && selectedDebateBook ? String(selectedDebateBook.bookId ?? selectedDebateBook.id) : null,
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
        if (isDebate && (action === 'conclude' || streamResult.action === 'conclude')) {
          setModeSummaries((prev) => ({
            ...prev,
            debate: {
              isConcluded: true,
              summary: streamResult.debateSummary || streamResult.summary || null,
            },
          }));
        }

        setModeAnswers((prev) => {
          const updated = {
            ...prev,
            [activeMode]: {
              text: streamResult.text || prev[activeMode]?.text || '',
              switchTo: streamResult.switchTo || prev[activeMode]?.switchTo || null,
              library_books: streamResult.library_books || prev[activeMode]?.library_books || [],
              libraryBooks: streamResult.library_books || prev[activeMode]?.libraryBooks || [],
              recommended_books: streamResult.recommended_books || prev[activeMode]?.recommended_books || [],
              recommendedBooks: streamResult.recommended_books || prev[activeMode]?.recommendedBooks || [],
              signals: streamResult.signals || prev[activeMode]?.signals || null,
            },
          };
          if (onAnswer) onAnswer(updated[activeMode]);
          return updated;
        });

        setModeMessages((prev) => {
          const list = prev[activeMode] || [];
          if (list.length === 0) return prev;
          const updated = [...list];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              text: streamResult.text || updated[lastIdx].text,
              recommendedBooks: streamResult.recommended_books || updated[lastIdx].recommendedBooks,
              libraryBooks: streamResult.library_books || updated[lastIdx].libraryBooks,
              isConcluded: isDebate && (action === 'conclude' || streamResult.action === 'conclude'),
              debateSummary: streamResult.debateSummary || null,
              signals: streamResult.signals || null,
              switchTo: streamResult.switchTo || null,
            };
          }
          return { ...prev, [activeMode]: updated };
        });
        return;
      }

      // SSE 스트리밍 실패 시 로컬 chatEngine 폴백
      const fallback = await answerQuestion(librarian, message, books);
      if (controller.signal.aborted) return;
      const fallbackAns = {
        text: fallback.text,
        switchTo: fallback.switchTo || null,
        library_books: [],
        libraryBooks: [],
        recommended_books: [],
        recommendedBooks: [],
      };
      setModeAnswers((prev) => ({ ...prev, [activeMode]: fallbackAns }));
      if (onAnswer) onAnswer(fallbackAns);

      const fallbackAssistantMsg = {
        role: 'assistant',
        text: fallback.text,
        senderIcon: currentSenderIcon,
        senderName: currentSenderName,
        recommendedBooks: [],
        libraryBooks: [],
        isConcluded: false,
        debateSummary: null,
        signals: null,
        switchTo: fallback.switchTo || null,
      };
      setModeMessages((prev) => ({
        ...prev,
        [activeMode]: [...(prev[activeMode] || []), fallbackAssistantMsg],
      }));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // 답변 대기(thinking) 상태가 변경될 때 상위 LibraryScene에 알림
  useEffect(() => {
    if (onLoadingChange) onLoadingChange(loading);
  }, [loading, onLoadingChange]);

  // 새 메시지가 오거나 로딩 상태가 바뀔 때 대화창 내부를 맨 아래로 자동 스크롤
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages, loading, open]);

  // 사서 또는 사용자 계정이 변경되면 사서별 & 계정별 분리된 대화 세션 및 메시지 히스토리를 로드하여 복원
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);

    const saved = loadSavedChatSessionByLibrarian(librarian?.id, currentUserId, 'chat');
    if (saved && (saved.answer || (saved.messages && saved.messages.length > 0))) {
      const savedMessages = saved.messages || (saved.answer ? [{
        role: 'assistant',
        text: saved.answer.text,
        senderIcon: '🐾',
        senderName: librarianNames[librarian?.id] || librarian?.displayName || librarian?.name || '사서',
        recommendedBooks: saved.answer.recommended_books || saved.answer.recommendedBooks || [],
        libraryBooks: saved.answer.library_books || saved.answer.libraryBooks || [],
        isConcluded: false,
        debateSummary: null,
        signals: saved.answer.signals || null,
        switchTo: saved.answer.switchTo || null,
      }] : []);

      setModeAnswers((prev) => ({ ...prev, chat: saved.answer || null }));
      setModeMessages((prev) => ({ ...prev, chat: savedMessages }));
      if (saved.sessionId) {
        setChatSessionId(saved.sessionId);
      }
      if (saved.lastUserMessage) {
        setLastUserMessage(saved.lastUserMessage);
      }
      if (saved.open !== undefined) {
        setOpen(saved.open);
      }
      if (onAnswer) {
        onAnswer(saved.answer || null);
      }
    } else {
      const newChatId = generateSessionId();
      setChatSessionId(newChatId);
      setModeAnswers((prev) => ({ ...prev, chat: null }));
      setModeMessages((prev) => ({ ...prev, chat: [] }));
      if (onAnswer) {
        onAnswer(null);
      }
    }
    setChatMode('chat');
  }, [librarian?.id, librarian?.displayName, librarian?.name, librarianNames, currentUserId, onAnswer, setChatSessionId, setLastUserMessage]);

  const handleSendMessage = (textToSend, action = 'chat') => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;
    setInput('');
    sendQuery(text, librarian.id, action);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleChangeMode = (mode) => {
    setChatMode(mode);
    if (onAnswer) onAnswer(modeAnswers[mode] || null);
  };

  // 닫힌 상태 (open === false)
  if (!open) {
    return (
      <MobileChatFAB
        isMobile={isMobile}
        open={open}
        setOpen={setOpen}
        librarian={librarian}
        librarianNames={librarianNames}
        clickMotion={clickMotion}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        fabPos={fabPos}
        onFabPointerDown={handleFabPointerDown}
        onOpenTimer={onOpenTimer}
        theme={theme}
        setTheme={setTheme}
        navigate={navigate}
      />
    );
  }

  // 열린 상태 (open === true)
  return (
    <>
      {isMobile && (
        <div
          className="lc-mobile-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className={`lc-chat-panel ${isMobile ? 'mobile' : 'desktop'}`}>
        {/* 1. 최상단 헤더 */}
        <ChatHeader
          librarian={librarian}
          chatMode={chatMode}
          onNewChat={handleNewChat}
          onClose={() => setOpen(false)}
        />

        {/* 2. 모드 전환 탭 */}
        <ChatModeTabs
          chatMode={chatMode}
          onChangeMode={handleChangeMode}
        />

        {/* 3. 상단 고정 날씨·시간대·무드 뱃지 */}
        {chatMode === 'chat' && currentAnswer?.signals && !loading && (
          <div className="lc-weather-badge-wrap">
            <WeatherMoodBadge signals={currentAnswer.signals} />
          </div>
        )}

        {/* 3-1. 토론 모드 상단 설정 배너 */}
        <DebateSetupSection
          chatMode={chatMode}
          debateCollapsed={debateCollapsed}
          setDebateCollapsed={setDebateCollapsed}
          debateStep={debateStep}
          setDebateStep={setDebateStep}
          debaterPersona={debaterPersona}
          setDebaterPersona={setDebaterPersona}
          selectedDebatePersona={selectedDebatePersona}
          selectedDebateBook={selectedDebateBook}
          setSelectedDebateBook={setSelectedDebateBook}
          debateBookQuery={debateBookQuery}
          setDebateBookQuery={setDebateBookQuery}
          debateLibraryBooks={debateLibraryBooks}
          books={books}
          loading={loading}
          modeAnswers={modeAnswers}
          modeMessages={modeMessages}
          onConcludeDebate={handleConcludeDebate}
        />

        {/* 스크롤 가능한 본문 영역 */}
        <div className="lc-content-body">
          {/* 모드 1: 내 서재 빠른 조회 */}
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

          {/* 모드 2 & 3: 메시지 리스트 */}
          {(chatMode !== 'debate' || debateCollapsed) && (
            <ChatMessageList
              currentMessages={currentMessages}
              recommendedBooks={recommendedBooks}
              books={books}
              librarian={librarian}
              librarianNames={librarianNames}
              selectedDebatePersona={selectedDebatePersona}
              chatMode={chatMode}
              loading={loading}
              turnCount={turnCount}
              lastUserMessage={lastUserMessage}
              isBookRecommendationQuery={isBookRecommendationQuery}
              getRecommendationLoadingMessage={getRecommendationLoadingMessage}
              targetSwitchName={targetSwitchName}
              currentAnswer={currentAnswer}
              isConcluded={isConcluded}
              debateSummary={debateSummary}
              onRegisterBook={handleRegisterBook}
              onOpenDetail={handleOpenDetail}
              messagesEndRef={messagesEndRef}
            />
          )}

          {/* 추천 및 서재 액션 카드 */}
          <ChatBookCards
            chatMode={chatMode}
            libraryBooks={libraryBooks}
            recommendedBooks={recommendedBooks}
            loading={loading}
            currentAnswer={currentAnswer}
            onOpenDetail={handleOpenDetail}
            onRegisterBook={handleRegisterBook}
          />
        </div>

        {/* 메시지 입력창 */}
        <ChatInputForm
          input={input}
          setInput={setInput}
          loading={loading}
          chatMode={chatMode}
          selectedDebateBook={selectedDebateBook}
          selectedDebatePersona={selectedDebatePersona}
          maxMessageLength={MAX_MESSAGE_LENGTH}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  );
}
