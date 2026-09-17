import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * 개발 서버 프록시.
 *
 * /api 요청은 서비스별로 다른 백엔드로 나뉜다. 기본값은 셋 다 로컬이고,
 * 로컬에 띄우지 않은 서비스만 .env.local에서 배포된 주소로 바꿔 쓰면 된다.
 * (VITE_ 접두사가 없어 브라우저 번들에는 들어가지 않는다 — dev 서버 전용)
 *
 *   AUTH_API=http://<배포된 backend-auth 주소>
 *   DISCOVERY_API=http://<배포된 backend-discovery 주소>
 *
 * 경로 → 서비스
 *   /api/v1/ocr/*                         → backend-record  (표지 OCR)
 *   /api/v1/books, /library/*, /librarian* → backend-book    (서재·도서 검색)
 *   /api/v1/classify-genre                 → backend-discovery (장르 분류)
 *   그 외 /api/*  (auth, users, terms)     → backend-auth
 *
 * localhost 대신 127.0.0.1을 명시해 Node의 IPv6(::1) 우선 해석으로 인한
 * ECONNREFUSED(AggregateError)를 피한다. uvicorn은 기본적으로 IPv4에만 바인딩된다.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // 새 조직 백엔드 서버 2개 연동 지원 (기본값 설정 및 환경변수 오버라이드)
  // 1. 메인 백엔드 (인증, 도서, 서재, OCR 등)
  const MAIN_API = env.MAIN_BACKEND_URL || env.AUTH_API || 'http://127.0.0.1:8000'
  // 2. AI/추천 에이전트 백엔드 (사서 채팅, AI 추천 등: backend-ai-agent 8001)
  const AI_API = env.AI_BACKEND_URL || env.DISCOVERY_API || 'http://127.0.0.1:8001'

  // 레거시 분기용 개별 URL 지원 (필요 시)
  const RECORD_API = env.RECORD_API || MAIN_API
  const BOOK_API = env.BOOK_API || MAIN_API

  // 배포/개발 시 refresh 토큰 쿠키 도메인 리라이트
  const proxy = (target) => ({ target, changeOrigin: true, cookieDomainRewrite: '' })

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./app', import.meta.url)),
      },
    },
    server: {
      // 먼저 선언한 규칙이 우선하므로 좁은 경로부터 나열한다.
      proxy: {
        '/api/v1/chat': proxy(AI_API),
        '/api/v1/classify-genre': proxy(AI_API),
        '/api/v1/reports': proxy(AI_API),
        '/api/v1/vision': proxy(AI_API),
        '/api/v1/ocr': proxy(AI_API),
        '/api/v1/records': proxy(RECORD_API),
        '/api/v1/books': proxy(BOOK_API),
        '/api/v1/library': proxy(BOOK_API),
        '/api/v1/librarians': proxy(BOOK_API),
        '/api/v1/librarian-types': proxy(BOOK_API),
        '/api': proxy(MAIN_API),
      },
    },
  }
})
