/**
 * 자리 배치 엔진 (규칙 기반 최적화 + 설명 가능한 의사결정 로그)
 *
 * 왜 규칙 엔진인가?
 * - 갈등 학생 분리 같은 '절대 조건'은 LLM이 확률적으로 어길 수 있어 코드로 보장해야 한다.
 * - 교사가 학부모·학생에게 "왜 이 자리인가"를 설명하려면 점검표(체크리스트)와 학생별 근거가 필요하다.
 * - AI(Gemini)는 결과를 검토·서술하는 '조언자' 역할로 두어 설득력을 높인다. (api/gemini-seating.js review 모드)
 *
 * 좌석 모델: rows x cols 격자. row 0 = 맨 앞. 짝꿍 = 같은 행의 (col 짝수, col 짝수+1) 쌍.
 * 인접 = 상하좌우·대각선(체비쇼프 거리 1).
 */
import { buildClassGraph } from './studentSignals.js';

export const DEFAULT_POLICY = {
  pairMode: 'mixed',            // 'mixed' 남녀 짝꿍 | 'same' 동성 짝꿍 | 'free' 무관
  separateConflicts: true,      // 갈등 학생 인접 금지 (사실상 필수)
  strugglingFront: true,        // '힘듦' 학생 앞쪽 배치·분산
  supporterForIsolated: true,   // 고립·외로움 학생 옆에 지지자
  mutualNear: true,             // 상호 지목 쌍 근접
  avoidPreviousDeskmate: true,  // 직전 짝꿍 반복 회피
  spreadGender: true,           // 성별 특정 구역 쏠림 방지
};

export const POLICY_LABELS = {
  pairMode: { label: '짝꿍 구성', options: { mixed: '남녀 짝꿍', same: '동성 짝꿍', free: '성별 무관' }, desc: '남녀 짝꿍은 이성 간 협력 경험과 소음·장난 감소에 효과적이라는 현장 경험이 많습니다.' },
  separateConflicts: { label: '갈등 학생 분리', desc: '서로 갈등을 언급한 학생은 옆·앞뒤·대각선에 두지 않습니다. (절대 조건)' },
  strugglingFront: { label: '힘듦 학생 앞줄·분산', desc: '기분이 힘든 학생은 교사가 표정을 살피기 쉬운 앞 두 줄에, 서로 뭉치지 않게 둡니다.' },
  supporterForIsolated: { label: '고립 학생 옆 지지자', desc: '지목을 받지 못했거나 외로움을 표현한 학생 옆에는 지목을 많이 받고 안정된 학생을 둡니다.' },
  mutualNear: { label: '서로 지목한 친구 근접', desc: '상호 지목 쌍은 옆·앞뒤로 가까이 두어 정서적 안전기지를 만듭니다.' },
  avoidPreviousDeskmate: { label: '직전 짝꿍 반복 회피', desc: '지난 배치와 같은 짝이 되지 않게 해 새로운 관계 경험을 넓힙니다.' },
  spreadGender: { label: '성별 쏠림 방지', desc: '남학생·여학생이 특정 구역에 몰리지 않게 합니다.' },
};

const W = {
  conflict: 1000, sameGenderPair: 40, strugglingBack: 30, strugglingCluster: 20,
  isolatedNoSupporter: 35, mutualFar: 10, prevDeskmate: 25, genderBlock: 6, emptyFront: 8, rowNoHealthy: 6,
};

const key = (r, c) => `${r}_${c}`;
const parse = (k) => k.split('_').map(Number);
const partnerCol = (c, cols) => { const p = c % 2 === 0 ? c + 1 : c - 1; return p >= 0 && p < cols ? p : null; };
const adjacent = (a, b) => Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1;

/** 학생 특성 사전 계산 */
const buildFeatures = (studentsData) => {
  const graph = buildClassGraph(studentsData);
  const feats = new Map();
  graph.forEach((node, id) => {
    const s = node.student;
    const struggling = s.mood === '힘듦';
    const isolated = (node.received === 0 && node.mutual.size === 0) || node.lonelyCount > 0;
    const supporter = !struggling && node.received >= 2 && node.conflicts.size === 0 && node.mutualConflicts.size === 0;
    feats.set(id, {
      id, student: s, gender: s.gender === '남' || s.gender === '여' ? s.gender : null,
      struggling, healthy: s.mood === '건강', isolated, supporter,
      lonely: node.lonelyCount, received: node.received,
      conflicts: new Set([...node.conflicts, ...[...graph.keys()].filter(o => graph.get(o).conflicts.has(id))]), // 양방향 통합
      mutual: node.mutual,
    });
  });
  return { graph, feats };
};

const prevDeskmates = (previousSeats, cols) => {
  const pairs = new Set();
  if (!previousSeats) return pairs;
  Object.entries(previousSeats).forEach(([k, id]) => {
    const [r, c] = parse(k);
    const pc = partnerCol(c, cols);
    if (pc === null) return;
    const other = previousSeats[key(r, pc)];
    if (other && other !== id) pairs.add([id, other].sort().join('|'));
  });
  return pairs;
};

/**
 * 배치 평가: 비용(낮을수록 좋음) + 점검표 + 학생별 근거
 * seats: { "r_c": studentId }
 */
export const evaluateSeating = (seats, { rows, cols, studentsData, previousSeats = null, policy = DEFAULT_POLICY, feats: featsIn = null }) => {
  const { feats } = featsIn ? { feats: featsIn } : buildFeatures(studentsData);
  const pos = new Map();
  Object.entries(seats).forEach(([k, id]) => { if (feats.has(id)) { const [r, c] = parse(k); pos.set(id, { r, c }); } });
  const at = (r, c) => seats[key(r, c)];
  const prevPairs = policy.avoidPreviousDeskmate ? prevDeskmates(previousSeats, cols) : new Set();

  let cost = 0;
  const reasons = new Map();
  const addReason = (id, text, kind = 'ok') => { if (!reasons.has(id)) reasons.set(id, []); reasons.get(id).push({ text, kind }); };
  const nameOf = (id) => feats.get(id)?.student?.realName || feats.get(id)?.student?.nickname || id;

  const checks = {
    conflictAdjacent: { label: '갈등 학생 인접', value: 0, total: 0, goodWhenZero: true },
    mixedPairs: { label: policy.pairMode === 'same' ? '동성 짝꿍' : '남녀 짝꿍', value: 0, total: 0 },
    strugglingFront: { label: "'힘듦' 학생 앞 두 줄", value: 0, total: 0 },
    isolatedSupported: { label: '고립·외로움 학생 옆 지지자', value: 0, total: 0 },
    mutualNear: { label: '서로 지목 쌍 근접(인접)', value: 0, total: 0 },
    repeatedDeskmates: { label: '직전 짝꿍 반복', value: 0, total: 0, goodWhenZero: true },
    placed: { label: '배치된 학생', value: pos.size, total: feats.size },
  };

  // 1) 갈등 인접 (쌍 단위)
  const seenPair = new Set();
  feats.forEach((f, id) => {
    f.conflicts.forEach(o => {
      const pk = [id, o].sort().join('|');
      if (seenPair.has(pk)) return;
      seenPair.add(pk);
      checks.conflictAdjacent.total += 1;
      const pa = pos.get(id), pb = pos.get(o);
      if (pa && pb) {
        if (adjacent(pa, pb)) {
          checks.conflictAdjacent.value += 1;
          if (policy.separateConflicts) cost += W.conflict;
          addReason(id, `⚠ 갈등 상대 ${nameOf(o)}와 인접`, 'bad');
          addReason(o, `⚠ 갈등 상대 ${nameOf(id)}와 인접`, 'bad');
        } else {
          const d = Math.max(Math.abs(pa.r - pb.r), Math.abs(pa.c - pb.c));
          addReason(id, `갈등 상대 ${nameOf(o)}와 ${d}칸 분리`, 'ok');
          addReason(o, `갈등 상대 ${nameOf(id)}와 ${d}칸 분리`, 'ok');
        }
      }
    });
  });

  // 2) 짝꿍 구성 / 직전 짝꿍 / 지지자
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c += 2) {
      const pc = partnerCol(c, cols);
      const a = at(r, c), b = pc !== null ? at(r, pc) : null;
      if (a && b) {
        const fa = feats.get(a), fb = feats.get(b);
        if (!fa || !fb) continue;
        checks.mixedPairs.total += 1;
        if (fa.gender && fb.gender) {
          const mixed = fa.gender !== fb.gender;
          const want = policy.pairMode === 'mixed' ? mixed : policy.pairMode === 'same' ? !mixed : true;
          if (policy.pairMode !== 'free') {
            if (want) { checks.mixedPairs.value += 1; addReason(a, `${policy.pairMode === 'mixed' ? '남녀' : '동성'} 짝꿍: ${nameOf(b)}`, 'ok'); addReason(b, `${policy.pairMode === 'mixed' ? '남녀' : '동성'} 짝꿍: ${nameOf(a)}`, 'ok'); }
            else cost += W.sameGenderPair;
          } else { checks.mixedPairs.value += 1; }
        }
        const pk = [a, b].sort().join('|');
        checks.repeatedDeskmates.total += 1;
        if (prevPairs.has(pk)) { checks.repeatedDeskmates.value += 1; cost += W.prevDeskmate; addReason(a, `직전 배치와 같은 짝(${nameOf(b)})`, 'warn'); }
      }
    }
  }

  // 3) 힘듦 학생 위치·분산, 고립 학생 지지자, 상호 지목 근접
  const frontRows = Math.min(2, rows);
  feats.forEach((f, id) => {
    const p = pos.get(id);
    if (!p) return;
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nid = at(p.r + dr, p.c + dc);
      if (nid && feats.has(nid)) neighbors.push(nid);
    }
    const pc = partnerCol(p.c, cols);
    const partner = pc !== null ? at(p.r, pc) : null;

    if (f.struggling) {
      checks.strugglingFront.total += 1;
      if (p.r < frontRows) { checks.strugglingFront.value += 1; addReason(id, `기분 '힘듦' → 교사 관찰이 쉬운 ${p.r + 1}번째 줄`, 'ok'); }
      else if (policy.strugglingFront) { cost += W.strugglingBack * (p.r - frontRows + 1); addReason(id, `기분 '힘듦'이지만 ${p.r + 1}번째 줄(뒤쪽)`, 'warn'); }
      const strugglingNbrs = neighbors.filter(n => feats.get(n).struggling);
      if (strugglingNbrs.length && policy.strugglingFront) { cost += W.strugglingCluster * strugglingNbrs.length; addReason(id, `힘듦 학생끼리 인접(${strugglingNbrs.map(nameOf).join(', ')})`, 'warn'); }
    }

    if (f.isolated) {
      checks.isolatedSupported.total += 1;
      const partnerF = partner ? feats.get(partner) : null;
      const supNbr = neighbors.find(n => feats.get(n).supporter);
      if (partnerF && partnerF.supporter) { checks.isolatedSupported.value += 1; addReason(id, `${f.lonely ? '외로움 신호' : '받은 지목 없음'} → 안정된 지지자 ${nameOf(partner)}와 짝`, 'ok'); }
      else if (supNbr) { checks.isolatedSupported.value += 1; cost += 8; addReason(id, `${f.lonely ? '외로움 신호' : '받은 지목 없음'} → 지지자 ${nameOf(supNbr)} 인접`, 'ok'); }
      else if (policy.supporterForIsolated) { cost += W.isolatedNoSupporter; addReason(id, `${f.lonely ? '외로움 신호' : '받은 지목 없음'}인데 주변에 지지자 없음`, 'warn'); }
      // 고립 학생끼리 짝 → 추가 페널티
      if (partnerF && partnerF.isolated && policy.supporterForIsolated) cost += 15;
    }

    f.mutual.forEach(o => {
      if (id > o) return; // 쌍당 1회
      checks.mutualNear.total += 1;
      const po = pos.get(o);
      if (po) {
        if (adjacent(p, po)) { checks.mutualNear.value += 1; addReason(id, `서로 지목한 ${nameOf(o)}와 가까이`, 'ok'); addReason(o, `서로 지목한 ${nameOf(id)}와 가까이`, 'ok'); }
        else if (policy.mutualNear) cost += W.mutualFar;
      }
    });
  });

  // 4) 성별 쏠림(2x2 블록 동일 성별), 앞줄 빈자리, 행마다 건강 학생 분산
  if (policy.spreadGender) {
    for (let r = 0; r + 1 < rows; r++) for (let c = 0; c + 1 < cols; c++) {
      const ids = [at(r, c), at(r, c + 1), at(r + 1, c), at(r + 1, c + 1)].filter(i => i && feats.has(i));
      if (ids.length === 4) {
        const gs = ids.map(i => feats.get(i).gender).filter(Boolean);
        if (gs.length === 4 && new Set(gs).size === 1) cost += W.genderBlock;
      }
    }
  }
  const total = pos.size;
  const seatsCount = rows * cols;
  if (total < seatsCount) {
    // 빈자리는 뒤쪽으로: 앞줄 빈자리 페널티
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!at(r, c)) cost += W.emptyFront * (rows - r);
  }
  for (let r = 0; r < rows; r++) {
    let any = false, healthy = false;
    for (let c = 0; c < cols; c++) { const id = at(r, c); if (id && feats.has(id)) { any = true; if (feats.get(id).healthy) healthy = true; } }
    if (any && !healthy) cost += W.rowNoHealthy;
  }

  // 점검표 상태 계산
  Object.values(checks).forEach(ch => {
    if (ch.goodWhenZero) ch.status = ch.total === 0 ? 'na' : ch.value === 0 ? 'pass' : 'fail';
    else ch.status = ch.total === 0 ? 'na' : ch.value === ch.total ? 'pass' : ch.value / ch.total >= 0.6 ? 'partial' : 'fail';
  });
  if (policy.pairMode === 'free') checks.mixedPairs.status = 'na';
  if (!policy.avoidPreviousDeskmate || !previousSeats) checks.repeatedDeskmates.status = 'na';

  return { cost, checks, reasons, feats };
};

/**
 * 최적 배치 탐색: 휴리스틱 초기해 + 담금질(Simulated Annealing) 스왑 탐색
 */
export const generateSeating = ({ rows, cols, studentsData, previousSeats = null, policy = DEFAULT_POLICY, iterations = 9000, seed = Date.now() }) => {
  const { feats } = buildFeatures(studentsData);
  const ids = [...feats.keys()];
  const seatsCount = rows * cols;

  // 간단한 시드 기반 난수 (재현 가능)
  let s = seed >>> 0 || 1;
  const rand = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };

  // 초기해: 힘듦→앞, 고립→지지자 옆 등을 고려한 정렬 + 성별 교차 배치
  const priority = (id) => { const f = feats.get(id); return (f.struggling ? -3 : 0) + (f.isolated ? -2 : 0) + (f.supporter ? -1 : 0) + rand() * 0.5; };
  const order = [...ids].sort((a, b) => priority(a) - priority(b)).slice(0, seatsCount);
  const boys = order.filter(id => feats.get(id).gender === '남');
  const girls = order.filter(id => feats.get(id).gender === '여');
  const unknown = order.filter(id => !feats.get(id).gender);
  let seq;
  if (policy.pairMode === 'mixed') {
    seq = [];
    let bi = 0, gi = 0, ui = 0;
    while (seq.length < order.length) {
      const pickB = bi < boys.length, pickG = gi < girls.length;
      if (pickB && pickG) { if (seq.length % 2 === 0) { seq.push(boys[bi++]); seq.push(girls[gi++]); } else { seq.push(girls[gi++]); seq.push(boys[bi++]); } }
      else if (pickB) seq.push(boys[bi++]);
      else if (pickG) seq.push(girls[gi++]);
      else seq.push(unknown[ui++]);
    }
  } else {
    seq = order;
  }
  const slots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push(key(r, c));
  let current = {};
  seq.forEach((id, i) => { if (i < slots.length) current[slots[i]] = id; });

  const ctx = { rows, cols, studentsData, previousSeats, policy, feats };
  let currentCost = evaluateSeating(current, ctx).cost;
  let best = { ...current }, bestCost = currentCost;

  const T0 = 60, T1 = 0.5;
  for (let i = 0; i < iterations; i++) {
    const T = T0 * Math.pow(T1 / T0, i / iterations);
    const k1 = slots[Math.floor(rand() * slots.length)];
    const k2 = slots[Math.floor(rand() * slots.length)];
    if (k1 === k2) continue;
    if (!current[k1] && !current[k2]) continue;
    const next = { ...current };
    const a = next[k1], b = next[k2];
    if (b) next[k1] = b; else delete next[k1];
    if (a) next[k2] = a; else delete next[k2];
    const c = evaluateSeating(next, ctx).cost;
    if (c <= currentCost || rand() < Math.exp((currentCost - c) / T)) {
      current = next; currentCost = c;
      if (c < bestCost) { best = { ...next }; bestCost = c; }
    }
  }

  const result = evaluateSeating(best, ctx);
  const placed = new Set(Object.values(best));
  return {
    seats: best,
    cost: bestCost,
    checks: result.checks,
    reasons: result.reasons,
    unplaced: ids.filter(id => !placed.has(id)),
    policy,
  };
};

/** 점검표 → 100점 만점 점수 (교사에게 직관적으로) */
export const scoreFromChecks = (checks) => {
  let score = 100;
  const c = checks;
  if (c.conflictAdjacent.status === 'fail') score -= 40 * Math.min(1, c.conflictAdjacent.value / Math.max(1, c.conflictAdjacent.total)) + 10;
  const ratio = (ch) => (ch.status === 'na' || ch.total === 0 ? 1 : ch.value / ch.total);
  score -= Math.round((1 - ratio(c.mixedPairs)) * 15);
  score -= Math.round((1 - ratio(c.strugglingFront)) * 12);
  score -= Math.round((1 - ratio(c.isolatedSupported)) * 15);
  score -= Math.round((1 - ratio(c.mutualNear)) * 8);
  if (c.repeatedDeskmates.status === 'fail') score -= Math.min(10, c.repeatedDeskmates.value * 3);
  if (c.placed.total > 0) score -= Math.round((1 - c.placed.value / c.placed.total) * 20);
  return Math.max(0, Math.min(100, Math.round(score)));
};
