import { createServer } from 'vite';
import assert from 'node:assert/strict';

/**
 * RegisterBook.jsx getGenreSubLabel 다국어(KO/EN) 회귀 테스트
 */
async function runTests() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { getGenreSubLabel } = await vite.ssrLoadModule('/app/pages/RegisterBook.jsx');
    assert.ok(getGenreSubLabel, 'getGenreSubLabel 함수가 export되어 있어야 합니다.');

    // 1. 한국어 모드 검증
    assert.equal(getGenreSubLabel('TECHNOLOGY', '건강/의학', '', false), '기술과학 (건강/의학)', '한국어 세부 주제 조합');
    assert.equal(getGenreSubLabel('TECHNOLOGY', '', '', false), '기술과학', '한국어 메인 장르만 표시');
    assert.equal(getGenreSubLabel('LITERATURE', 'SF', 'SF/과학소설', false), '문학 (SF/과학소설)', '한국어 displayGenre 조합');
    assert.equal(getGenreSubLabel('LITERATURE', 'SF', '문학 (SF/과학소설)', false), '문학 (SF/과학소설)', '중복 괄호 방지');
    assert.equal(getGenreSubLabel('PHILOSOPHY', '심리', '철학', false), '철학', '메인 라벨과 동일한 displayGenre 중복 방지');
    assert.equal(getGenreSubLabel('NONE', '', '', false), '미지정', '한국어 NONE 미지정 변환');
    assert.equal(getGenreSubLabel('', '', '', false), '미지정', '한국어 빈 문자열 미지정');
    assert.equal(getGenreSubLabel(null, '', '', false), '미지정', '한국어 null 미지정');
    assert.equal(getGenreSubLabel('미지정', '', '', false), '미지정', '한국어 기존 미지정 유지');
    assert.equal(getGenreSubLabel('CUSTOM_GENRE', '', '', false), 'CUSTOM_GENRE', '알 수 없는 코드 원본 유지');

    // 2. 영어 모드 검증 (한국어 세부 주제 차단 및 메인 장르 영문화)
    assert.equal(getGenreSubLabel('TECHNOLOGY', '건강/의학', '', true), 'Technology / Science', '영어 모드에서 한국어 세부 주제 차단');
    assert.equal(getGenreSubLabel('PHILOSOPHY', '심리학', '', true), 'Philosophy', '영어 모드 철학 번역');
    assert.equal(getGenreSubLabel('LITERATURE', 'SF/과학소설', '', true), 'Literature', '영어 모드 문학 번역 및 한글 세부주제 차단');
    assert.equal(getGenreSubLabel('NONE', '', '', true), 'Unspecified', '영어 모드 NONE Unspecified');
    assert.equal(getGenreSubLabel('', '', '', true), 'Unspecified', '영어 모드 빈 문자열 Unspecified');
    assert.equal(getGenreSubLabel('Unspecified', '', '', true), 'Unspecified', '영어 모드 Unspecified 유지');
    assert.equal(getGenreSubLabel('CUSTOM_GENRE', '', '', true), 'CUSTOM_GENRE', '영어 모드 알 수 없는 코드 원본 유지');

    // 3. formatGenreContext 주입 동작 검증
    const mockFormatGenreEn = (code) => (code === 'TECHNOLOGY' ? 'Technology / Science' : code);
    assert.equal(getGenreSubLabel('TECHNOLOGY', '건강/의학', '', true, mockFormatGenreEn), 'Technology / Science');

    const mockFormatGenreKo = (code) => (code === 'TECHNOLOGY' ? '기술과학' : code);
    assert.equal(getGenreSubLabel('TECHNOLOGY', '건강/의학', '', false, mockFormatGenreKo), '기술과학 (건강/의학)');

    console.log('✅ All 19 assertions for getGenreSubLabel passed successfully!');
  } finally {
    await vite.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
