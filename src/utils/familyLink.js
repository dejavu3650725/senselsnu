/**
 * 가정 연계(학교–가정) 로직
 * 원천: src/data/seoulFamily.json — 서울특별시교육청 고등학교 가정연계 가정통신문 5종(소개편·자기·대인관계·공동체·마음건강) 원문 구조화
 *       src/data/seoulSel.json    — 초·중은 학년 차시(학습 주제·학습 목표)로 자동 구성
 * 원칙: 학생 개인 데이터(기분·지목·갈등·대화)는 어떤 문서에도 넣지 않는다. 가정에 전하는 것은 '이 시기에 배우는 것'과 '함께 나눌 대화'뿐이다.
 */
import family from '../data/seoulFamily.json' with { type: 'json' };
import { SEOUL, seoulLevelOf, lessonsFor, areasForCompetencies } from './seoulSel.js';

export const FAMILY = family;
export const AREA_ORDER = ['자기', '대인관계', '공동체', '마음건강'];
export const LETTER_KINDS = [
  { key: 'intro', label: '소개편', desc: '서울 사회정서교육이 무엇인지, 가정 협력이 왜 중요한지' },
  { key: '자기', label: '자기 영역', desc: '감정 인식·조절, 자아존중감, 자기 주도' },
  { key: '대인관계', label: '대인관계 영역', desc: '관점 이해, 공감, 의사소통, 갈등 해결' },
  { key: '공동체', label: '공동체 영역', desc: '소속감, 협력, 책임 있는 의사 결정' },
  { key: '마음건강', label: '마음건강 영역', desc: '마음건강 이해, 어려움 대처, 도움 요청' },
];

const AREA_DEF = {};
SEOUL.areas.forEach(a => {
  const comps = a.competencies.map(k => SEOUL.competencies.find(c => c.key === k)).filter(Boolean);
  AREA_DEF[a.name] = { competencies: comps.map(c => `${c.seoulName} 역량`).join(', '), definition: comps.map(c => c.description).join(' 또한 ') };
});

const levelName = (g) => ({ elementary: '초등학교', middle: '중학교', high: '고등학교' }[seoulLevelOf(g)]);
const gradeNum = (g) => Number(g.slice(1));
const childWord = (g) => seoulLevelOf(g) === 'elementary' ? '아이' : '자녀';

/** 초·중: 차시 → 가정 대화 팁 자동 구성 (학년 자료의 학습 주제·목표를 그대로 인용) */
const tipsFromLessons = (gradeLabel, area) => {
  const lessons = lessonsFor(gradeLabel, [area], 40);
  const seen = new Set();
  const out = [];
  lessons.forEach(l => {
    const topic = l.gradeTopic || l.lessonTopic || l.title;
    if (!topic || seen.has(topic)) return;
    seen.add(topic);
    out.push({
      skill: l.skill || area,
      desc: `학교에서 「${topic}」을(를) 배웁니다. (학습 목표: ${l.goal})`,
      question: `학교에서 '${(l.lessonTopic || topic).replace(/하기$/, '')}' 배웠다던데, 어땠어?`,
      actions: [
        `${childWord(gradeLabel)}가 수업에서 했던 활동을 한 가지만 이야기해 달라고 해 주세요. 평가하지 않고 끝까지 들어 주시면 충분합니다.`,
        `수업 목표는 “${l.goal}”입니다. 집에서도 한 번 해 볼 기회를 만들어 주세요.`,
        '잘 안 되어도 괜찮다는 말을 먼저 해 주세요. 사회정서기술은 연습으로 자라는 기술입니다.',
      ],
      standards: l.standards,
    });
  });
  return out;
};

/**
 * 통신문 모델 생성
 * @param kind 'intro' | '자기' | '대인관계' | '공동체' | '마음건강'
 */
export const buildLetter = ({ kind, gradeLabel, className = '', schoolName = '', teacherName = '' }) => {
  const level = seoulLevelOf(gradeLabel);
  const lvName = levelName(gradeLabel);
  const school = schoolName || `○○${lvName}`;
  const verbatim = level === 'high';
  const source = verbatim
    ? '서울특별시교육청 사회정서교육자료(고등학교) 가정연계 가정통신문 예시를 바탕으로 작성'
    : `서울특별시교육청 사회정서교육자료(${gradeLabel.replace('초', '초등 ').replace('중', '중학교 ')}학년)의 학습 주제·학습 목표를 바탕으로 자동 구성`;

  if (kind === 'intro') {
    const hi = family.high.intro;
    const skills = SEOUL.skills[level];
    const counts = AREA_ORDER.map(a => `${a} 영역 ${skills[a].length}개`).join(', ');
    const total = AREA_ORDER.reduce((n, a) => n + skills[a].length, 0);
    const skillIntro = verbatim
      ? hi.skillIntro
      : AREA_ORDER.flatMap(a => skills[a].map(sk => {
          const lesson = (SEOUL.lessons[gradeLabel] || []).find(l => l.skill === sk);
          return { area: a, skill: sk, desc: lesson ? `${lesson.gradeTopic || lesson.lessonTopic}` : '' };
        }));
    const levelNote = verbatim ? hi.levelNote
      : level === 'middle'
        ? '서울 사회정서교육은 초등 1학년부터 고등 3학년까지 발달 단계와 발달 과제를 고려하여 지속적·일관적인 위계 체계로 구성되어 있습니다. 중학교 시기는 감정의 폭이 넓어지고 또래 관계가 삶의 중심이 되는 때이므로, 감정과 행동을 스스로 조절하고 건강한 관계를 맺는 기술을 직접 배우고 연습하는 것이 중요합니다.'
        : '서울 사회정서교육은 초등 1학년부터 고등 3학년까지 발달 단계와 발달 과제를 고려하여 지속적·일관적인 위계 체계로 구성되어 있습니다. 초등학교 시기는 학교생활에 필요한 기본 습관과 바른 인성의 바탕을 다지는 때이므로, 감정을 알아차리고 조절하며 친구와 사이좋게 지내고 도움을 요청하는 기술을 놀이와 활동으로 익힙니다.';
    return {
      kind, gradeLabel, school, className, teacherName, source, verbatim,
      title: `${lvName === '고등학교' ? '' : `${gradeLabel.replace(/^./, '')}학년 `}서울 사회정서교육 ${lvName} (소개편)`,
      greeting: hi.greeting,
      levelNote,
      structure: `${lvName === '고등학교' ? '고등학생' : lvName === '중학교' ? '중학생' : '초등학생'}의 특성을 반영하여 서울 사회정서교육(${lvName})은 ${counts}, 총 ${total}개의 사회정서기술로 구성되어 있습니다.`,
      skillIntro,
      whyFamily: hi.whyFamily,
      request: hi.request.replace(/자녀/g, childWord(gradeLabel)),
      closing: hi.closing,
    };
  }

  const area = kind;
  if (verbatim) {
    const a = family.high.areas[area];
    return { kind, gradeLabel, school, className, teacherName, source, verbatim, area, title: `서울 사회정서교육 ${area} 영역 가정 연계 안내`, ...a, common: family.high.common };
  }
  const def = AREA_DEF[area] || {};
  const lessons = lessonsFor(gradeLabel, [area], 40);
  const topics = Array.from(new Set(lessons.map(l => l.gradeTopic || l.lessonTopic).filter(Boolean)));
  return {
    kind, gradeLabel, school, className, teacherName, source, verbatim, area,
    title: `${gradeLabel.replace(/^./, '')}학년 서울 사회정서교육 ${area} 영역 가정 연계 안내`,
    greeting: `본교에서는 학생들이 자신과 타인을 이해하고, 건강한 관계 속에서 함께 성장할 수 있도록 서울 사회정서교육을 운영하고 있습니다. 이번 안내문은 그 중 ‘${area} 영역’에서 ${gradeLabel.replace(/^./, '')}학년이 배우는 내용을 가정에서도 자연스럽게 이어 가실 수 있도록 준비한 자료입니다.`,
    definition: def.definition ? `${area} 영역은 ${def.definition}을 기르는 영역입니다.` : '',
    competencies: def.competencies || '',
    skills: SEOUL.skills[level][area],
    schoolActivities: topics.length ? `학생들은 수업을 통해 ${topics.join(', ')} 등을 배우고 연습합니다.` : '',
    tips: tipsFromLessons(gradeLabel, area),
    closing: '가정에서 이루어지는 작은 대화와 따뜻한 지지는 학생의 성장에 큰 힘이 됩니다. 학교에서도 학생들이 배운 기술을 일상에서 꾸준히 연습할 수 있도록 지도하겠습니다. 앞으로도 학교와 가정이 함께 협력할 수 있기를 바랍니다. 감사합니다.',
    common: family.high.common,
  };
};

/**
 * 학생별 학부모 대화 카드 — 학생 데이터 없이, 초점 역량 → 영역 → 가정 대화 팁만 담는다.
 * @param focusKeys 교육부 역량 키 배열 (assessStudent.focus[].key)
 */
export const buildParentCard = ({ focusKeys = [], gradeLabel, studentName = '', teacherName = '', className = '' }) => {
  const areas = areasForCompetencies(focusKeys.length ? focusKeys : ['selfAwareness']);
  const level = seoulLevelOf(gradeLabel);
  const tips = [];
  areas.forEach(area => {
    const list = level === 'high' ? (family.high.areas[area]?.tips || []) : tipsFromLessons(gradeLabel, area);
    list.slice(0, 2).forEach(t => tips.push({ area, ...t }));
  });
  return { areas, tips: tips.slice(0, 4), gradeLabel, studentName, teacherName, className };
};

export const parentCardToText = (card) => {
  const who = card.studentName ? `${card.studentName} 학생` : '자녀';
  const lines = [];
  lines.push(`[${card.className || '우리 반'} 가정 연계 안내] ${who} 보호자님께`);
  lines.push(`안녕하세요, ${card.teacherName || '담임교사'}입니다. 요즘 우리 반은 서울 사회정서교육 ${card.areas.join('·')} 영역을 연습하고 있습니다. 가정에서도 아래처럼 짧은 대화를 나눠 주시면 아이의 배움이 오래 갑니다.`);
  card.tips.forEach((t, i) => {
    lines.push('');
    lines.push(`${i + 1}. ${t.skill} — ${t.desc}`);
    lines.push(`   먼저 건네볼 말: “${t.question}”`);
    t.actions.forEach(a => lines.push(`   · ${a}`));
  });
  lines.push('');
  lines.push('잘 안 되어도 괜찮습니다. 사회정서기술은 연습으로 자라는 기술입니다. 궁금한 점은 언제든 연락 주세요.');
  lines.push('(출처: 서울특별시교육청 사회정서교육자료 가정연계 안내)');
  return lines.join('\n');
};
