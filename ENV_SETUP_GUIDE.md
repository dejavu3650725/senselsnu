# 🔐 SEN-SEL API 키 · 환경 변수 설정 가이드

이 프로젝트는 **API 키를 코드에 직접 쓰지 않고**, 환경 변수(.env)로 분리해서 관리합니다.
이 문서 하나만 따라 하면 로컬 개발과 Vercel 배포 모두에서 키가 안전하게 동작합니다.

---

## 1. 전체 구조 이해하기 (2분 요약)

이 프로젝트에는 성격이 다른 **두 종류의 키**가 있습니다.

| 구분 | 변수 이름 | 읽는 곳 | 코드에서 읽는 방법 |
|---|---|---|---|
| Firebase 설정 | `VITE_FIREBASE_*` (6개) | 브라우저(클라이언트) | `import.meta.env.VITE_FIREBASE_API_KEY` |
| Gemini API 키 | `GEMINI_API_KEY` | 서버(Vercel Functions) | `process.env.GEMINI_API_KEY` |

> **`os.getenv()`와의 관계**: 파이썬의 `os.getenv("API_KEY")`에 해당하는 것이
> 자바스크립트(Node.js)에서는 `process.env.API_KEY`입니다.
> 이 프로젝트의 서버 코드(`api/gemini-counseling.js`, `api/gemini-prescription.js`)는
> 이미 `process.env.GEMINI_API_KEY`로 키를 읽도록 되어 있어서,
> 여러분은 **키 값을 환경 변수에 등록만 하면** 됩니다. 코드는 건드릴 필요가 없습니다.

**왜 Gemini 키에는 `VITE_`를 붙이면 안 되나요?**
Vite는 `VITE_` 접두사가 붙은 변수만 브라우저 쪽 코드에 노출합니다.
Gemini 키에 `VITE_`를 붙이면 브라우저 개발자 도구(F12)에서 키가 그대로 보이게 됩니다.
그래서 Gemini 호출은 반드시 서버(`/api/...`)를 거치고, 키는 `VITE_` 없이 서버에만 둡니다.

```
[학생 브라우저] --(키 없음)--> [/api/gemini-counseling (Vercel 서버)] --(GEMINI_API_KEY)--> [Google Gemini]
```

---

## 2. 로컬 개발 환경 설정 (내 컴퓨터)

### 2-1. .env.local 파일 만들기

프로젝트 폴더(package.json이 있는 곳)에서:

```bash
# Windows (명령 프롬프트)
copy .env.example .env.local
```

### 2-2. 실제 값 채워넣기

`.env.local`을 메모장/에디터로 열고 값을 채웁니다.

- **Firebase 값 6개**: [Firebase 콘솔](https://console.firebase.google.com) → 프로젝트 설정(⚙️) → 일반 → 내 앱 → "SDK 설정 및 구성"의 `firebaseConfig` 값을 그대로 복사
- **GEMINI_API_KEY**: [Google AI Studio](https://aistudio.google.com/apikey)에서 발급

```env
VITE_FIREBASE_API_KEY=AIzaSy........
VITE_FIREBASE_AUTH_DOMAIN=sensel-xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sensel-xxxx
VITE_FIREBASE_STORAGE_BUCKET=sensel-xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef

GEMINI_API_KEY=AIzaSy........   # ← VITE_ 붙이지 마세요!
```

⚠️ 값에 따옴표(`"`)나 공백을 넣지 마세요. `KEY=값` 형태 그대로 씁니다.

### 2-3. 로컬에서 실행하기

`/api` 서버리스 함수까지 함께 테스트하려면 Vercel CLI를 사용하는 것이 가장 간단합니다.

```bash
npm install -g vercel   # 최초 1회
vercel dev              # .env.local의 GEMINI_API_KEY까지 자동으로 읽어줍니다
```

화면(UI)만 볼 때는 기존처럼 `npm run dev`도 됩니다.
(단, 이 경우 챗봇 API 호출은 `vite.config.js`의 프록시 설정에 따라 별도 API 서버가 필요합니다.)

### 2-4. 값 바꾼 뒤에는 꼭 재시작

`.env.local`을 수정했다면 실행 중인 `vercel dev` / `npm run dev`를 껐다가 다시 켜야 반영됩니다.

---

## 3. Vercel 배포 환경 설정

배포 서버에는 `.env.local` 파일이 올라가지 않으므로, Vercel 대시보드에 직접 등록합니다.

1. [Vercel 대시보드](https://vercel.com) → 프로젝트 선택
2. **Settings → Environment Variables**
3. 아래 7개 변수를 하나씩 추가 (Production / Preview / Development 모두 체크 권장)
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `GEMINI_API_KEY`
4. **재배포(Redeploy)** — 환경 변수는 배포 시점에 주입되므로 저장 후 반드시 재배포해야 적용됩니다.

---

## 4. 보안 체크리스트 ✅

- [ ] `.env`, `.env.local`이 `.gitignore`에 포함되어 있다 (✔ 이미 설정됨: `.env`, `.env.*`)
- [ ] 소스 코드 어디에도 `AIzaSy...` 같은 실제 키 문자열이 하드코딩되어 있지 않다
- [ ] Gemini 키는 `VITE_` 접두사 없이 서버에서만 사용한다
- [ ] 키가 실수로 GitHub에 올라갔다면: **즉시 해당 키를 폐기(revoke)하고 새로 발급** (커밋 삭제만으로는 부족합니다)
- [ ] Firebase 콘솔에서 Firestore 보안 규칙을 설정해 두었다
  (Firebase의 `VITE_FIREBASE_API_KEY`는 원래 클라이언트에 노출되는 식별자이며, 실제 보안은 Firestore 규칙이 담당합니다)

---

## 5. 자주 발생하는 문제 (FAQ)

**Q. 화면이 하얗게 나오고 콘솔에 Firebase 오류가 떠요.**
→ `VITE_FIREBASE_*` 값이 비어있을 가능성이 큽니다. `.env.local` 값 확인 후 dev 서버 재시작.

**Q. 챗봇이 "GEMINI_API_KEY is not configured" 오류를 반환해요.**
→ 서버 쪽에 키가 등록되지 않은 상태입니다. 로컬이면 `.env.local`에 `GEMINI_API_KEY` 추가 후 `vercel dev` 재시작, 배포면 Vercel 환경 변수 등록 후 재배포.

**Q. `import.meta.env.VITE_...`가 undefined예요.**
→ ① 변수 이름이 `VITE_`로 시작하는지 ② 파일 이름이 `.env.local`(오타 주의)인지 ③ dev 서버를 재시작했는지 확인하세요.
