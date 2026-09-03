// Firestore 보안 규칙 테스트 (로컬 에뮬레이터 필요)
// 실행: npm i -D @firebase/rules-unit-testing firebase-tools && npx firebase emulators:exec --only firestore --project demo-sensel "node scripts/test-firestore-rules.mjs"
// firebase.json 의 emulators.firestore.port 를 8089 로 맞추거나 아래 port 를 수정하세요.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';
const env = await initializeTestEnvironment({ projectId: 'demo-sensel', firestore: { rules: fs.readFileSync(new URL('../firestore.rules', import.meta.url),'utf8'), host: '127.0.0.1', port: 8089 } });
await env.clearFirestore();
// seed
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db,'classes/C1'), { classCode:'C1', teacherUid:'T1', isDemo:false });
  await setDoc(doc(db,'classes/2026ai'), { classCode:'2026ai', teacherUid:'T1', isDemo:true });
  await setDoc(doc(db,'teachers/T1'), { teacherName:'김', selLevel:'elementary_high' });
  await setDoc(doc(db,'students/s1'), { classCode:'C1', realName:'A', nickname:'a', messages:[] });
  await setDoc(doc(db,'students/s2'), { classCode:'C2', realName:'B', nickname:'b' });
  await setDoc(doc(db,'students/d1'), { classCode:'2026ai', realName:'D' });
});
const teacher = env.authenticatedContext('T1', { firebase: { sign_in_provider: 'google.com' } }).firestore();
const otherT = env.authenticatedContext('T2', { firebase: { sign_in_provider: 'google.com' } }).firestore();
const anon = env.authenticatedContext('S_anon', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const nobody = env.unauthenticatedContext().firestore();
let n=0; const ok=async(p,l)=>{await assertSucceeds(p); console.log('✓',l); n++;}; const no=async(p,l)=>{await assertFails(p); console.log('✓ (denied)',l); n++;};

await no(getDoc(doc(nobody,'classes/C1')), '비로그인 학급 읽기');
await no(getDocs(query(collection(nobody,'students'), where('classCode','==','C1'))), '비로그인 학생 목록');
await ok(getDoc(doc(anon,'classes/C1')), '학생 학급코드 검증');
await no(getDocs(query(collection(anon,'teachers'), where('classCode','==','C1'))), '학생 teachers 목록 조회');
await no(setDoc(doc(anon,'studentSessions/S_anon'), { classCode:'NOPE' }), '없는 학급으로 세션');
await ok(setDoc(doc(anon,'studentSessions/S_anon'), { classCode:'C1' }), '세션 생성');
await no(setDoc(doc(anon,'studentSessions/OTHER'), { classCode:'C1' }), '남의 세션 생성');
await ok(getDoc(doc(anon,'teachers/T1')), '학생이 교사 설정 get');
await ok(getDocs(query(collection(anon,'students'), where('classCode','==','C1'))), '학생 자기 학급 명단');
await no(getDocs(query(collection(anon,'students'), where('classCode','==','C2'))), '학생 다른 학급 명단');
await no(getDoc(doc(anon,'students/s2')), '학생 다른 학급 문서');
await ok(addDoc(collection(anon,'students'), { classCode:'C1', realName:'N', nickname:'n' }), '학생 자기 문서 생성');
await no(addDoc(collection(anon,'students'), { classCode:'C2', realName:'N' }), '학생 다른 학급에 생성');
await ok(updateDoc(doc(anon,'students/s1'), { mood:'힘듦' }), '학생 문서 갱신');
await no(updateDoc(doc(anon,'students/s1'), { classCode:'C2' }), '학생 classCode 변경');
await no(deleteDoc(doc(anon,'students/s1')), '학생 삭제');
await no(getDoc(doc(anon,'seatingCharts/C1')), '학생 자리배치 읽기');
await ok(getDocs(query(collection(teacher,'students'), where('classCode','==','C1'))), '교사 자기 학급 학생');
await no(getDocs(query(collection(teacher,'students'), where('classCode','==','C2'))), '교사 남의 학급 학생');
await ok(getDocs(query(collection(otherT,'students'), where('classCode','==','2026ai'))), '다른 교사 데모 학급 학생');
await ok(setDoc(doc(otherT,'classes/2026ai'), { classCode:'2026ai', teacherUid:'T2', isDemo:true }, { merge:true }), '다른 교사 데모 학급 갱신');
await no(setDoc(doc(otherT,'classes/C1'), { teacherUid:'T2' }, { merge:true }), '다른 교사 남의 학급 탈취');
await ok(setDoc(doc(teacher,'classes/C9'), { classCode:'C9', teacherUid:'T1', isDemo:false }), '교사 학급 생성');
await no(setDoc(doc(teacher,'classes/C10'), { classCode:'C10', teacherUid:'T2' }), '남 명의 학급 생성');
await ok(getDocs(query(collection(teacher,'classes'), where('teacherUid','==','T1'))), '교사 학급 목록');
await ok(deleteDoc(doc(teacher,'students/s1')), '교사 학생 삭제');
await ok(setDoc(doc(teacher,'seatingCharts/C1'), { seats:{} }), '교사 자리배치 저장');
await no(setDoc(doc(otherT,'seatingCharts/C1'), { seats:{} }), '다른 교사 자리배치 저장');
await ok(setDoc(doc(teacher,'teachers/T1'), { ptiser:{} }, { merge:true }), '교사 프로필 저장');
await no(setDoc(doc(anon,'teachers/S_anon'), { x:1 }), '학생 교사 프로필 생성');
await ok(updateDoc(doc(teacher,'students/d1'), { aiPrescription:'x' }), '교사 데모 학생 처방 저장');
console.log('passed', n);
await env.cleanup();
