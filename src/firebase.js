import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
// Security: Using environment variables instead of hardcoding keys.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
// 학교 네트워크(크롬북·프록시·필터)에서 WebChannel 스트리밍이 막히는 경우가 잦아 롱폴링을 강제한다.
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
