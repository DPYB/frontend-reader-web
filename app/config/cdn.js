/**
 * 정적 에셋 CDN (Cloudflare R2 `dpyb-public` 버킷 + 커스텀 도메인)
 *
 * - 빌드 시 `VITE_ASSET_BASE_URL`로 덮어쓸 수 있으며, 미설정 시 운영 CDN 주소를 사용한다.
 * - R2 버킷 폴더 구조를 그대로 경로로 사용한다. (예: background_UI/readingroom_cat.webp)
 */
const DEFAULT_ASSET_BASE_URL = 'https://cdn.ai0208.xyz';

export const ASSET_BASE_URL = (import.meta.env.VITE_ASSET_BASE_URL || DEFAULT_ASSET_BASE_URL).replace(/\/+$/, '');

/** R2 버킷 내 상대 경로를 CDN 절대 URL로 변환 */
export function cdnUrl(path) {
  return `${ASSET_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}
