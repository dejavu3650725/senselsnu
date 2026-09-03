/**
 * /api/* 호출 공통 헬퍼
 * - Firebase Auth ID 토큰을 Authorization 헤더에 실어 보낸다. (서버 api/_auth.js에서 검증)
 * - 학생은 익명 로그인, 교사는 구글 로그인 상태여야 한다.
 */
import { auth, db } from '../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const waitForAuth = () => new Promise(resolve => {
  if (auth.currentUser) return resolve(auth.currentUser);
  const unsub = onAuthStateChanged(auth, u => { unsub(); resolve(u); });
});

/** 현재 사용자의 ID 토큰 (없으면 null) */
export const getIdToken = async () => {
  const user = await waitForAuth();
  if (!user) return null;
  try { return await user.getIdToken(); } catch { return null; }
};

/** 인증 헤더가 포함된 POST fetch */
export const apiPost = async (url, body) => {
  const token = await getIdToken();
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
};

/**
 * 학생 세션 보장: 로그인이 없으면 익명 로그인 후, studentSessions/{uid}에 학급 코드를 기록한다.
 * Firestore 규칙은 이 문서의 classCode로 학생이 자기 학급 데이터만 읽고 쓰도록 제한한다.
 * (Firebase 콘솔 > Authentication > 로그인 방법 > '익명' 사용 설정 필요)
 */
export const ensureStudentSession = async (classCode) => {
  let user = await waitForAuth();
  if (!user) {
    const cred = await signInAnonymously(auth);
    user = cred.user;
  }
  if (classCode) {
    await setDoc(doc(db, 'studentSessions', user.uid), {
      classCode,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
  return user;
};
