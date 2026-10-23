/**
 * DPYB BETA 설문조사 디스코드 웹훅 연동 서비스
 *
 * - 사용자가 제출한 첫 방문 / 재방문 설문 데이터를 Discord Embed 카드로 포맷팅하여 실시간 알림을 발송합니다.
 * - 불편사항 및 버그 캡처 이미지가 첨부된 경우 Discord 멀티파트 첨부파일(attachment://)로 함께 전송합니다.
 */

const DEFAULT_WEBHOOK_URL =
  'https://discord.com/api/webhooks/1562823224213901462/kQpDBQ9dLs1oOTrf0cHs0VKH2-0Sgg3fsZPDm_8dQd7T3hqeoqhF2KvWOWhGc3VDspff';

const DISCORD_WEBHOOK_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DISCORD_SURVEY_WEBHOOK_URL) || DEFAULT_WEBHOOK_URL;
const AVATAR_URL = 'https://cdn.ai0208.xyz/profile/librarian/cat.webp';
const USERNAME = 'DPYB 피드백 알리미';

/**
 * DataURL (Base64)을 Blob 객체로 변환
 */
function dataURLtoBlob(dataurl) {
  if (!dataurl || typeof dataurl !== 'string' || !dataurl.startsWith('data:')) return null;
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error('Failed to parse data URL to blob:', err);
    return null;
  }
}

/**
 * 첫 방문 설문 Discord Embed 페이로드 생성
 */
export function buildFirstVisitDiscordPayload(form) {
  const fields = [];

  // 1. 이용 환경 & 나이대 & 디자인 점수
  const browser = form.browser === '기타' && form.browserOther ? `기타 (${form.browserOther})` : (form.browser || '미선택');
  const device = form.device ? `${form.device}${form.deviceDetail ? ` (${form.deviceDetail})` : ''}` : '미선택';
  fields.push({ name: '💻 이용 환경', value: `기기: ${device}\n브라우저: ${browser}`, inline: false });

  const age = form.ageGroup === '기타' && form.ageGroupOther ? `기타 (${form.ageGroupOther})` : (form.ageGroup || '미선택');
  fields.push({ name: '🎂 연령대', value: age, inline: true });

  const stars = form.designScore > 0 ? '⭐'.repeat(form.designScore) + ` (${form.designScore}점 / 5점)` : '미평가';
  fields.push({ name: '🎨 디자인 만족도', value: stars, inline: true });

  // 2. 서비스 첫인상 및 이해도
  const understandMap = {
    immediate: '① 바로 이해됨 💡',
    approximate: '② 대략 감은 옴 🤔',
    confusing: '③ 무엇을 하는 곳인지 잘 모르겠음 ❓',
  };
  fields.push({
    name: '💡 서비스 첫인상 및 이해도',
    value: understandMap[form.understanding] || form.understanding || '미선택',
    inline: false,
  });

  // 3. 유사 서비스 경험
  const similar = form.similarServiceUsed === 'yes'
    ? `있음 (${form.similarServiceName ? `서비스: ${form.similarServiceName}` : '서비스명 미입력'})`
    : (form.similarServiceUsed === 'no' ? '없음 (처음 사용)' : '미선택');
  fields.push({ name: '📚 유사 독서 서비스 경험', value: similar, inline: false });

  // 4. 기존 독서 기록 방식
  const recordMap = {
    paper: '① 종이 독서노트 / 다이어리',
    memo: '② 메모 앱 (노션, 기본 메모 등)',
    other_app: '③ 타 독서 앱 (밀리의 서재, 열품타 등)',
    none: '④ 따로 기록하지 않음',
  };
  const recordWays = (form.bookRecordWays || []).map((id) => recordMap[id] || id);
  if (form.bookRecordWayOther) recordWays.push(`기타 (${form.bookRecordWayOther})`);
  fields.push({
    name: '✍️ 기존 독서 기록 방식',
    value: recordWays.length > 0 ? recordWays.join('\n') : '미선택',
    inline: false,
  });

  // 5. 회원가입/로그인 과정의 난이도
  const signupMap = {
    lack_guidance: form.signupDifficultyDetail
      ? `① 다음 단계 안내 부족 (${form.signupDifficultyDetail})`
      : '① 다음 단계 안내 부족',
    no_issue: '② 불편 없음',
    other: form.signupDifficultyOther ? `③ 기타 (${form.signupDifficultyOther})` : '③ 기타',
  };
  fields.push({
    name: '🔐 회원가입/로그인 과정',
    value: signupMap[form.signupDifficulty] || form.signupDifficulty || '미선택',
    inline: false,
  });

  // 6. 이용해본 기능
  const features = [...(form.featuresUsed || [])];
  if (form.featuresOther) features.push(`기타 (${form.featuresOther})`);
  fields.push({
    name: '✨ 사용해 본 기능',
    value: features.length > 0 ? features.join(', ') : '없음',
    inline: false,
  });

  // 7. 헷갈리거나 어려운 부분
  if (form.confusingPart && form.confusingPart.trim()) {
    fields.push({
      name: '🤔 헷갈리거나 어려웠던 점',
      value: form.confusingPart.trim().slice(0, 1000),
      inline: false,
    });
  }

  return {
    username: USERNAME,
    avatar_url: AVATAR_URL,
    embeds: [
      {
        title: '📋 [DPYB BETA] 새로운 첫 방문 설문조사가 접수되었습니다!',
        color: 0xff7a00, // DPYB 시그니처 오렌지
        description: '새로운 사용자가 서비스에 처음 방문하여 남겨주신 소중한 첫인상 피드백입니다.',
        fields,
        footer: { text: `DPYB Beta Feedback System • ${new Date().toLocaleString('ko-KR')}` },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * 재방문 설문 Discord Embed 및 첨부파일 페이로드 생성
 */
export function buildReturningDiscordPayload(form) {
  const fields = [];

  // 1. 이용 환경 & 종합 만족도
  const browser = form.browser === '기타' && form.browserOther ? `기타 (${form.browserOther})` : (form.browser || '미선택');
  const device = form.device ? `${form.device}${form.deviceDetail ? ` (${form.deviceDetail})` : ''}` : '미선택';
  fields.push({ name: '💻 이용 환경', value: `기기: ${device}\n브라우저: ${browser}`, inline: true });

  const overallStars = form.overallSatisfaction > 0 ? '⭐'.repeat(form.overallSatisfaction) + ` (${form.overallSatisfaction}점 / 5점)` : '미평가';
  fields.push({ name: '🏆 종합 만족도', value: overallStars, inline: true });

  // 2. 서비스 속도 체감
  const speedMap = {
    very_fast: '매우 빠름 ⚡',
    good: '적당함 👍',
    slow: '조금 느림 🐢',
    very_slow: '매우 느림 / 멈춤 ⚠️',
  };
  const speedVal = speedMap[form.speedSatisfaction] || form.speedSatisfaction || '미선택';
  const speedComment = form.speedComment ? ` (의견: ${form.speedComment})` : '';
  fields.push({ name: '⏱️ 속도 체감', value: `${speedVal}${speedComment}`, inline: false });

  // 3. 주요 이용 기능
  const features = [...(form.featuresUsed || [])];
  if (form.featuresOther) features.push(`기타 (${form.featuresOther})`);
  if (features.length > 0) {
    fields.push({ name: '🎯 주로 이용한 기능', value: features.join(', '), inline: false });
  }

  // 4. 가장 유용했던 기능 & 재방문 이유
  if (form.mostUsefulFeature && form.mostUsefulFeature.trim()) {
    fields.push({ name: '❤️ 가장 유용했던 기능', value: form.mostUsefulFeature.trim().slice(0, 1000), inline: false });
  }
  if (form.returnReason && form.returnReason.trim()) {
    fields.push({ name: '🔄 다시 방문하게 된 이유', value: form.returnReason.trim().slice(0, 1000), inline: false });
  }
  if (form.aiHelpfulness && form.aiHelpfulness.trim()) {
    fields.push({ name: '🐾 AI 사서의 도움 정도', value: form.aiHelpfulness.trim().slice(0, 1000), inline: false });
  }

  // 5. 불편했던 점
  if (form.inconvenience && form.inconvenience.trim()) {
    fields.push({ name: '⚠️ 가장 불편했던 점', value: form.inconvenience.trim().slice(0, 1000), inline: false });
  }

  // 6. 버그 제보
  if (form.bugEncounter && form.bugEncounter.trim()) {
    fields.push({ name: '🐛 발견한 버그나 오류', value: form.bugEncounter.trim().slice(0, 1000), inline: false });
  }

  // 7. 불필요한 기능 & 추가 희망 기능
  if (form.unnecessaryFeature && form.unnecessaryFeature.trim()) {
    fields.push({ name: '🗑️ 불필요하다고 느낀 기능', value: form.unnecessaryFeature.trim().slice(0, 1000), inline: false });
  }
  if (form.desiredFeature && form.desiredFeature.trim()) {
    fields.push({ name: '💡 추가되었으면 하는 기능', value: form.desiredFeature.trim().slice(0, 1000), inline: false });
  }

  // 8. 자유 의견
  if (form.freeFeedback && form.freeFeedback.trim()) {
    fields.push({ name: '💌 자유로운 한마디', value: form.freeFeedback.trim().slice(0, 1000), inline: false });
  }

  const mainEmbed = {
    title: '📬 [DPYB BETA] 새로운 재방문 설문조사가 접수되었습니다!',
    color: 0x259b36, // DPYB 그린/포레스트
    description: '서비스를 재방문하신 사용자의 상세한 사용 경험 및 개선 피드백입니다.',
    fields,
    footer: { text: `DPYB Beta Feedback System • ${new Date().toLocaleString('ko-KR')}` },
    timestamp: new Date().toISOString(),
  };

  const embeds = [mainEmbed];
  const files = [];

  if (form.inconvenienceImage) {
    const blob = dataURLtoBlob(form.inconvenienceImage);
    if (blob) {
      const filename = 'inconvenience.jpg';
      files.push({ name: filename, blob });
      embeds.push({
        title: '📸 [첨부] 불편사항 캡처 이미지',
        color: 0xff7a00,
        image: { url: `attachment://${filename}` },
      });
    }
  }

  if (form.bugImage) {
    const blob = dataURLtoBlob(form.bugImage);
    if (blob) {
      const filename = 'bug.jpg';
      files.push({ name: filename, blob });
      embeds.push({
        title: '🐛 [첨부] 버그 제보 캡처 이미지',
        color: 0xe02424,
        image: { url: `attachment://${filename}` },
      });
    }
  }

  return {
    payload: {
      username: USERNAME,
      avatar_url: AVATAR_URL,
      embeds,
    },
    files,
  };
}

/**
 * 설문 응답 데이터를 Discord 웹훅으로 전송
 */
export async function sendSurveyToDiscord(type, formData) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('Discord webhook URL is not configured.');
    return false;
  }

  try {
    if (type === 'first_visit') {
      const payload = buildFirstVisitDiscordPayload(formData);
      const res = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    }

    if (type === 'returning') {
      const { payload, files } = buildReturningDiscordPayload(formData);
      if (files && files.length > 0) {
        const fd = new FormData();
        fd.append('payload_json', JSON.stringify(payload));
        files.forEach((file, idx) => {
          fd.append(`files[${idx}]`, file.blob, file.name);
        });
        const res = await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          body: fd,
        });
        return res.ok;
      }

      const res = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    }

    return false;
  } catch (error) {
    console.error('Failed to send survey to Discord webhook:', error);
    return false;
  }
}
