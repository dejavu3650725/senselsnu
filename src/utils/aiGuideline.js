/**
 * 서울특별시교육청 「AI·에듀테크 공교육 도입 및 활용 가이드라인 v1.0」(2026.2) 헬퍼 — 4차 로직(준거층)
 * 원천: src/data/aiGuideline.json
 */
import guide from '../data/aiGuideline.json' with { type: 'json' };

export const GUIDE = guide;
export const VALUE_META = {
  autonomy: { name: '주도성', color: '#dd6b20' },
  purpose: { name: '합목적성', color: '#38a169' },
  inclusion: { name: '포용성', color: '#805ad5' },
  safety: { name: '안전성', color: '#3182ce' },
  transparency: { name: '투명성', color: '#d69e2e' },
};
export const valueName = (k) => VALUE_META[k]?.name || k;

export const guideLevelOf = (selLevel) => (selLevel === 'middle' ? 'middle' : selLevel === 'high' ? 'high' : 'elementary');
export const guideLevelLabel = (lv) => ({ elementary: '초등학교', middle: '중학교', high: '고등학교' }[lv] || lv);

/** 학생 핵심 가이드 6개 (학교급별) */
export const studentGuides = (selLevel) => guide.usage.studentCoreGuides[guideLevelOf(selLevel)] || [];
/** 학생 첫 대화 전 '약속' 3개 — 안전과 관계 · 비판적 검증 · 투명성 */
export const studentPromises = (selLevel) => {
  const g = studentGuides(selLevel);
  return [5, 3, 6].map(n => g.find(x => x.n === n)).filter(Boolean);
};
export const parentGuides = () => guide.usage.parentCoreGuides;
export const parentByLevel = (selLevel) => guide.usage.parentByLevel[guideLevelOf(selLevel)];
export const teacherGuides = () => guide.usage.teacherCoreGuides;
export const schoolLevelGen = (selLevel) => guide.generativeAI.schoolLevel[guideLevelOf(selLevel)];

/** 챗봇 프롬프트용 — 학생 가이드 '안전과 관계' 요지 */
export const chatbotGuideText = (selLevel) => {
  const g = studentGuides(selLevel);
  const safe = g.find(x => x.n === 5);
  return `[서울시교육청 AI·에듀테크 가이드라인 — 학생 '안전과 관계'] ${safe ? safe.title + ' ' + safe.text : ''}\n너는 사람이 아니라 프로그램이라는 점을 학생이 물으면 솔직히 말해. 학생이 너에게만 의지하려 하면 가족·친구·선생님과 실제로 마음을 나누도록 부드럽게 연결해. 이름·주소·전화번호·학교 같은 개인정보는 묻지도 받지도 마.`;
};

/** 처방 프롬프트용 — 교사 가이드 요지 */
export const prescriptionGuideText = () => {
  const t = guide.usage.teacherCoreGuides;
  const pick = [1, 3, 5, 7].map(n => t.find(x => x.n === n)).filter(Boolean);
  return `[서울시교육청 AI·에듀테크 가이드라인 — 교사 핵심 가이드]\n${pick.map(g => `- ${g.title}`).join('\n')}\n이 처방은 참고 자료이며 최종 판단은 교사에게 있음을 결과 문체에 반영하라(단정 금지). 학생 실명은 이미 익명화되어 있으니 그대로 둔다.`;
};
