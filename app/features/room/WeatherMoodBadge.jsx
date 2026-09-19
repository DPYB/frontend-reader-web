import { useState } from 'react';

/**
 * WeatherMoodBadge — 사서 응답의 signals(날씨·시간대·무드)를 컨텍스트 뱃지로 표시.
 *
 * location_source 규칙:
 *  - "user":          사용자 실제 좌표 → 정확한 온도까지 표시 ("18°C ☔")
 *  - "default_seoul": 서울 대체 조회 → "📍서울 기준" 보조 문구, 온도 대신 설명 위주
 *  - "text_stated":   메시지에 직접 언급 → 온도 null, 설명만
 *  - "none":          날씨 정보 없음 → 날씨 뱃지 미표시
 *
 * @param {object|null} signals - { weather, time_of_day, mood, genre_focus }
 */

const WEATHER_EMOJI = {
  clear: '☀️',
  cloudy: '☁️',
  rainy: '☔',
  snowy: '❄️',
  stormy: '⛈️',
  foggy: '🌫️',
};

const TIME_LABEL = {
  dawn: '새벽',
  day: '낮',
  evening: '저녁',
  night: '밤',
};

const MOOD_LABEL = {
  cozy: '아늑한',
  adventurous: '모험적인',
  reflective: '사색적인',
  dreamy: '몽환적인',
  thrilling: '짜릿한',
  calm: '차분한',
};

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 9px',
  borderRadius: 999,
  // CLIAR-301: 답변 박스와 같은 표면(배경·테두리)을 공유해 톤을 통일
  border: '1px solid var(--answer-border)',
  background: 'var(--answer-bg)',
  color: 'var(--text-h)',
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
};

const TEMP_NOTE = '실제 기온과 약 2~3°C 차이가 날 수 있어요.';

/**
 * WeatherChip — 날씨 칩. 온도가 표시될 때만 hover 시 우리 테마색 커스텀 툴팁을 보여줌.
 */
function WeatherChip({ weather }) {
  const [hover, setHover] = useState(false);
  const emoji = WEATHER_EMOJI[weather.condition] || '🌡️';
  const source = weather.location_source;

  /*
   * 백엔드 description(예: "맑음(쾌청한 하늘), 기온 19.4°C")을 짧게 정리한다
   * (사용자 요청, 2026-09):
   *  1. 괄호 부연설명 제거 → "맑음(쾌청한 하늘)" → "맑음"
   *  2. "기온" 단어 제거 → 단위(°C)만 봐도 온도인 걸 알 수 있어 불필요
   *  3. 소수점 온도를 반올림
   * 결과: "맑음(쾌청한 하늘), 기온 19.4°C" → "맑음, 19°C"
   * 길이가 줄어야 같은 줄에 분위기 태그가 함께 들어간다(줄바꿈 방지).
   */
  const rawDesc = weather.description || '';
  const desc = rawDesc
    .replace(/\([^)]*\)/g, '')
    .replace(/기온\s*/g, '')
    .replace(/(-?\d+(?:\.\d+)?)(\s*)°C/, (_match, num, space) => `${Math.round(Number(num))}${space}°C`)
    .replace(/\s*,\s*/g, ', ')
    .trim();

  /*
   * description에 이미 "°C" 온도가 포함되어 있으면 뱃지가 덧붙이는 근사 온도(≈19°C)는
   * 중복이라 표시하지 않는다. 예전엔 source==='user'이면 항상 tempText를 추가로
   * 붙여서 "기온 18°C ≈18°C"처럼 온도가 두 번 나오는 문제가 있었다(사용자 제보,
   * 2026-09). description에 온도가 없는 경우에만 근사 온도를 보조로 붙인다.
   */
  const descHasTemp = /°C/.test(rawDesc);
  const showTemp = source === 'user' && weather.temperature != null && !descHasTemp;
  const tempText = showTemp ? ` ≈${Math.round(weather.temperature)}°C` : '';

  return (
    <span
      style={{ ...chipStyle, position: 'relative', cursor: showTemp ? 'help' : 'default' }}
      onMouseEnter={() => showTemp && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {emoji} {desc}{tempText}
      {source === 'default_seoul' && (
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>· 📍서울 기준</span>
      )}

      {showTemp && hover && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-h)',
            fontSize: 15,
            fontWeight: 500,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            zIndex: 40,
          }}
        >
          {TEMP_NOTE}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--border)',
            }}
          />
        </span>
      )}
    </span>
  );
}

export default function WeatherMoodBadge({ signals }) {
  if (!signals) return null;

  // genre_focus는 표시하지 않으므로(CLIAR-244) 구조분해에서 제외한다.
  const { weather, time_of_day: timeOfDay, mood } = signals;
  const chips = [];

  // 날씨 칩 (condition이 있고 none이 아닐 때만)
  if (weather && weather.condition && weather.location_source !== 'none') {
    chips.push(<WeatherChip key="weather" weather={weather} />);
  }

  // 시간대 칩
  if (timeOfDay && TIME_LABEL[timeOfDay]) {
    chips.push(
      <span key="time" style={chipStyle}>
        🕒 {TIME_LABEL[timeOfDay]}
      </span>
    );
  }

  // 무드 칩
  if (mood && MOOD_LABEL[mood]) {
    chips.push(
      <span key="mood" style={chipStyle}>
        {MOOD_LABEL[mood]} 분위기
      </span>
    );
  }

  // 장르 포커스 칩은 표시하지 않는다 (CLIAR-244).
  // signals.genre_focus는 사서가 대화 무드로 자유 판단한 값이라 16개 표준 장르
  // Enum과 무관하고 실제 추천 도서 장르와 어긋난다(예: 에세이 추천에 상단 '미스터리').
  // 각 도서의 실제 표준 장르는 추천 카드(📖) 내부 칩(recommended_books[i].genre)에서
  // 저자 옆에 표시하므로, 상단에는 날씨/시간대/무드만 남긴다.

  if (chips.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
      {chips}
    </div>
  );
}
