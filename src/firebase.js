import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⬇️ 아까 복사해둔 설정값을 여기에 붙여넣으세요!
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCeYWGE-ZfhEwGLqaKElZeHATGAC9yph_s",
  authDomain: "mysongoursong-b115d.firebaseapp.com",
  projectId: "mysongoursong-b115d",
  storageBucket: "mysongoursong-b115d.firebasestorage.app",
  messagingSenderId: "151891985406",
  appId: "1:151891985406:web:88bd73a9b599451c67b6af"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// 2. 인증(Auth) 및 데이터베이스(DB) 도구 꺼내기
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;