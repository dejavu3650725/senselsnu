/**
 * API 공통 인증 헬퍼 (Vercel Serverless)
 *
 * - 프론트엔드는 Firebase Auth의 ID 토큰을 `Authorization: Bearer <token>` 헤더로 보낸다.
 * - 서버는 Firebase Auth REST(accounts:lookup)로 토큰을 검증한다. (firebase-admin 없이 동작, 추가 의존성 없음)
 *   · 이 프로젝트의 웹 API 키로만 검증되므로 다른 프로젝트 토큰은 거부된다.
 * - 익명 로그인(학생)과 구글 로그인(교사)을 구분해, 교사 전용 엔드포인트를 보호한다.
 * - 인스턴스 단위 간이 요청 제한(rate limit)으로 남용을 완화한다.
 *
 * 필요한 환경 변수: VITE_FIREBASE_API_KEY (Vercel에 이미 등록되어 있음)
 * 파일명이 '_'로 시작하므로 Vercel이 별도 함수로 배포하지 않는다.
 */

const LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

// 간이 rate limit (서버리스 인스턴스 메모리 기준, 최선 노력)
const buckets = new Map();
const RATE_LIMIT = { windowMs: 60 * 1000, max: 40 };
const checkRate = (key) => {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.start > RATE_LIMIT.windowMs) { buckets.set(key, { start: now, count: 1 }); return true; }
  b.count += 1;
  return b.count <= RATE_LIMIT.max;
};

const getBearer = (req) => {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
};

/**
 * 요청을 검증하고 사용자 정보를 돌려준다.
 * @returns {{ ok:true, uid:string, isAnonymous:boolean } | { ok:false, status:number, error:string }}
 */
export async function verifyRequest(req, { teacherOnly = false } = {}) {
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 500, error: '서버에 VITE_FIREBASE_API_KEY가 설정되지 않아 인증을 확인할 수 없습니다.' };
  }
  const token = getBearer(req);
  if (!token) {
    return { ok: false, status: 401, error: '로그인이 필요합니다. (Authorization 토큰 없음)' };
  }

  let data;
  try {
    const r = await fetch(`${LOOKUP_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    data = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(data.users) || data.users.length === 0) {
      return { ok: false, status: 401, error: '유효하지 않거나 만료된 로그인 토큰입니다. 다시 접속해주세요.' };
    }
  } catch (e) {
    console.error('Auth lookup failed:', e);
    return { ok: false, status: 503, error: '인증 서버에 연결할 수 없습니다.' };
  }

  const user = data.users[0];
  const providers = Array.isArray(user.providerUserInfo) ? user.providerUserInfo : [];
  const isAnonymous = providers.length === 0 && !user.email;
  if (user.disabled) return { ok: false, status: 403, error: '비활성화된 계정입니다.' };
  if (teacherOnly && isAnonymous) return { ok: false, status: 403, error: '교사 계정으로만 사용할 수 있는 기능입니다.' };

  if (!checkRate(user.localId)) {
    return { ok: false, status: 429, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' };
  }

  return { ok: true, uid: user.localId, isAnonymous };
}
