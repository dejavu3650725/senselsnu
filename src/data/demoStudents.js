/**
 * 데모 학급용 가상 학생 데이터 (포트폴리오 시연용)
 * - 실존 인물과 무관한 가상의 이름입니다.
 * - 소시오그램/관계 신호/AI 자리 배치가 의미 있게 보이도록 관계망을 설계했습니다:
 *   · 인기 학생 2명(박준서, 권서아) · 상호 지목 5쌍 · 상호 갈등 1쌍(이시우↔강지호)
 *   · 일방 갈등 1건(황예린→안수아) · 고립 학생 2명(오건우, 홍아린) · 외로움 신호 2명(홍아린, 정하준)
 */

export const DEMO_CLASS_CODE = '2026ai';
export const DEMO_CLASS_NAME = '5학년 데모반';

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const msg = (sender, text, h) => ({ sender, text, timestamp: hoursAgo(h) });

// 기본 대화 샘플 생성기
const defaultMessages = (nickname) => [
  msg('bot', `처음 뵙겠습니다, ${nickname}! 오늘 기분이 어때?`, 30),
  msg('user', '오늘 체육 시간에 피구 해서 재밌었어!', 30),
  msg('bot', '우와, 피구 신났겠다! 같이 하면 제일 재밌는 친구는 누구야?', 29),
];

export const generateDemoStudents = () => [
  // ===== 남학생 12명 =====
  {
    realName: '김도윤', nickname: '든든한 곰', gender: '남', avatar: '🐻', mood: '건강',
    nominations: ['빠른 치타', '축구왕 호랑이'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('든든한 곰'),
  },
  {
    realName: '이시우', nickname: '빠른 치타', gender: '남', avatar: '🐆', mood: '힘듦',
    nominations: ['든든한 곰'], conflicts: ['게임왕 여우'], lonelySignals: [],
    messages: [
      msg('bot', '다시 만나서 반가워, 빠른 치타!', 26),
      msg('user', '요즘 지호랑 자꾸 부딪혀서 속상해. 게임 얘기하다가 크게 싸웠어.', 26),
      msg('bot', '그랬구나, 많이 속상했겠다. 네 마음을 솔직하게 말해줘서 고마워. 선생님께 살짝 이야기해보는 것도 좋은 방법이야.', 25),
    ],
  },
  {
    realName: '박준서', nickname: '축구왕 호랑이', gender: '남', avatar: '🐯', mood: '건강',
    nominations: ['게임왕 여우', '든든한 곰'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('축구왕 호랑이'),
  },
  {
    realName: '정하준', nickname: '조용한 부엉이', gender: '남', avatar: '🦉', mood: '힘듦',
    nominations: ['수학왕 펭귄'], conflicts: [], lonelySignals: [hoursAgo(50)],
    messages: [
      msg('bot', '안녕, 조용한 부엉이! 쉬는 시간엔 주로 뭐 하면서 보내?', 50),
      msg('user', '그냥 자리에 혼자 앉아 있어. 가끔 심심해.', 50),
      msg('bot', '혼자 있는 시간도 소중하지만, 심심할 땐 나무한테 언제든 얘기해줘. 혹시 같이 놀아보고 싶은 친구가 있어?', 49),
      msg('user', '은찬이는 착한 것 같아. 수학도 잘 알려줘.', 49),
    ],
  },
  {
    realName: '최민재', nickname: '웃긴 원숭이', gender: '남', avatar: '🐵', mood: '건강',
    nominations: ['달리기 토끼', '축구왕 호랑이'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('웃긴 원숭이'),
  },
  {
    realName: '강지호', nickname: '게임왕 여우', gender: '남', avatar: '🦊', mood: '보통',
    nominations: ['축구왕 호랑이'], conflicts: ['빠른 치타'], lonelySignals: [],
    messages: [
      msg('bot', '게임왕 여우, 오늘 하루는 어땠어?', 24),
      msg('user', '시우가 내 캐릭터 갖고 놀렸어. 진짜 서운했어.', 24),
      msg('bot', '서운한 마음이 들었구나. 그 마음 충분히 이해해. 서로 오해가 있었을 수도 있으니, 마음이 가라앉으면 천천히 이야기해보면 어떨까?', 23),
    ],
  },
  {
    realName: '조은찬', nickname: '수학왕 펭귄', gender: '남', avatar: '🐧', mood: '건강',
    nominations: ['조용한 부엉이', '축구왕 호랑이'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('수학왕 펭귄'),
  },
  {
    realName: '윤서준', nickname: '달리기 토끼', gender: '남', avatar: '🐰', mood: '건강',
    nominations: ['웃긴 원숭이'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('달리기 토끼'),
  },
  {
    realName: '장현우', nickname: '그림쟁이 판다', gender: '남', avatar: '🐼', mood: '보통',
    nominations: ['만들기 마법사'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('그림쟁이 판다'),
  },
  {
    realName: '임태양', nickname: '태양 사자', gender: '남', avatar: '🦁', mood: '건강',
    nominations: ['축구왕 호랑이', '빠른 치타'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('태양 사자'),
  },
  {
    realName: '한이준', nickname: '용감한 독수리', gender: '남', avatar: '🦅', mood: '건강',
    nominations: ['게임왕 여우', '수학왕 펭귄'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('용감한 독수리'),
  },
  {
    realName: '오건우', nickname: '씩씩한 공룡', gender: '남', avatar: '🦖', mood: '보통',
    nominations: [], conflicts: [], lonelySignals: [],
    messages: [
      msg('bot', '씩씩한 공룡, 반가워! 요즘 학교 생활은 어때?', 40),
      msg('user', '그냥 그래.', 40),
      msg('bot', '그렇구나. 어떤 이야기든 편하게 해줘도 돼. 나무는 항상 여기 있을게!', 39),
    ],
  },

  // ===== 여학생 11명 =====
  {
    realName: '서지유', nickname: '노래하는 카나리아', gender: '여', avatar: '🐤', mood: '건강',
    nominations: ['책벌레 다람쥐', '친절한 돌고래'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('노래하는 카나리아'),
  },
  {
    realName: '신하은', nickname: '책벌레 다람쥐', gender: '여', avatar: '🐹', mood: '건강',
    nominations: ['노래하는 카나리아'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('책벌레 다람쥐'),
  },
  {
    realName: '권서아', nickname: '친절한 돌고래', gender: '여', avatar: '🐬', mood: '건강',
    nominations: ['꽃집 나비', '노래하는 카나리아'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('친절한 돌고래'),
  },
  {
    realName: '황예린', nickname: '발레리나 백조', gender: '여', avatar: '🦢', mood: '보통',
    nominations: ['친절한 돌고래'], conflicts: ['똑똑한 고양이'], lonelySignals: [],
    messages: [
      msg('bot', '발레리나 백조, 오늘 마음 날씨는 어때?', 20),
      msg('user', '수아가 모둠 활동 때 내 의견을 자꾸 무시하는 것 같아서 속상했어.', 20),
      msg('bot', '속상한 마음이 들었구나. 이야기해줘서 고마워. 수아도 몰랐을 수 있으니, 네 마음을 차분하게 전해보는 건 어떨까?', 19),
    ],
  },
  {
    realName: '안수아', nickname: '똑똑한 고양이', gender: '여', avatar: '🐱', mood: '보통',
    nominations: ['친절한 돌고래', '피아노 요정'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('똑똑한 고양이'),
  },
  {
    realName: '송지안', nickname: '꽃집 나비', gender: '여', avatar: '🦋', mood: '건강',
    nominations: ['친절한 돌고래', '웃음꽃 해바라기'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('꽃집 나비'),
  },
  {
    realName: '전소율', nickname: '웃음꽃 해바라기', gender: '여', avatar: '🌻', mood: '건강',
    nominations: ['피아노 요정'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('웃음꽃 해바라기'),
  },
  {
    realName: '홍아린', nickname: '조용한 별', gender: '여', avatar: '⭐', mood: '힘듦',
    nominations: [], conflicts: [], lonelySignals: [hoursAgo(70), hoursAgo(45)],
    messages: [
      msg('bot', '조용한 별, 만나서 반가워! 요즘 학교에서 마음이 불편했던 순간이 있었어?', 70),
      msg('user', '쉬는 시간에 같이 놀 친구가 없어. 다들 자기들끼리만 놀아.', 70),
      msg('bot', '혼자라고 느껴져서 많이 외로웠겠다. 그 마음 이야기해줘서 정말 고마워. 나무가 항상 네 편이 되어줄게.', 69),
      msg('user', '오늘도 점심시간에 혼자 있었어.', 45),
      msg('bot', '그랬구나. 네 마음이 얼마나 쓸쓸했을지 느껴져. 선생님도 네 이야기를 들으면 꼭 도와주고 싶어하실 거야.', 44),
    ],
  },
  {
    realName: '문채원', nickname: '피아노 요정', gender: '여', avatar: '🧚', mood: '건강',
    nominations: ['웃음꽃 해바라기', '친절한 돌고래'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('피아노 요정'),
  },
  {
    realName: '양다은', nickname: '운동왕 캥거루', gender: '여', avatar: '🦘', mood: '보통',
    nominations: ['축구왕 호랑이', '친절한 돌고래'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('운동왕 캥거루'),
  },
  {
    realName: '백서연', nickname: '만들기 마법사', gender: '여', avatar: '🧙', mood: '건강',
    nominations: ['그림쟁이 판다'], conflicts: [], lonelySignals: [],
    messages: defaultMessages('만들기 마법사'),
  },
];
