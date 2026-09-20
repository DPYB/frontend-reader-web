/**
 * 백엔드 두 곳(backend-core-api, backend-ai-agent)의 베이스 URL을 정의한다.
 *
 * dev 서버에서는 vite.config.js의 proxy가 경로별로 요청을 알맞은 백엔드로
 * 나눠 보내주지만(예: /api/v1/chat → AI_API, /api/v1/books → MAIN_API),
 * 프로덕션 빌드(Cloudflare Pages 등 정적 호스팅)에는 이 proxy가 없다. 그래서
 * 각 API 클라이언트가 자신이 실제로 호출할 백엔드의 절대 URL을 빌드 타임에
 * 주입받아야 한다(사용자 요청, 2026-09: Cloudflare Pages 배포 준비).
 *
 * 서비스 → 백엔드 매핑 (vite.config.js proxy 규칙과 동일하게 유지):
 *   CORE_API (backend-core-api): auth, users, terms, books, library, librarians
 *   AI_API   (backend-ai-agent): chat, classify-genre, reports, vision, ocr
 *
 * 값이 비어 있으면 같은 오리진의 '/api/v1'을 쓴다(로컬 dev 프록시, 또는 두 백엔드를
 * 같은 도메인 뒤에 리버스 프록시로 합쳐 배포하는 경우와 호환).
 */

export const CORE_API_BASE = import.meta.env.VITE_CORE_API_BASE_URL || '/api/v1';
export const AI_API_BASE = import.meta.env.VITE_AI_API_BASE_URL || '/api/v1';
