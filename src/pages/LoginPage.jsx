import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const LoginPage = ({ isSignupMode, setIsSignupMode }) => {
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [signupData, setSignupData] = useState({ age: '', gender: null });
  const [showTooltip, setShowTooltip] = useState(false);
  const ageOptions = ['10대', '20대', '30대', '40대', '50대', '60대', '70대', '80대', '90대 이상'];

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAuthAction();
  };

  // ⚡️ [핵심] 한글 닉네임을 영어 코드로 변환하는 함수 (DB 조회 없이 즉시 변환)
  const generateEmail = (nickname) => {
    try {
      // 한글 -> UTF-8 -> Base64 변환 (특수문자 제거)
      const encoded = btoa(unescape(encodeURIComponent(nickname))).replace(/[+/=]/g, '');
      return `${encoded}@hiddenstage.com`;
    } catch (e) {
      return `user_${Date.now()}@hiddenstage.com`; // 비상용
    }
  };

  const handleAuthAction = async () => {
    if (!name || !pw) {
      alert("닉네임과 암호를 입력해주세요."); return;
    }

    if (isSignupMode && (!signupData.age || !signupData.gender)) {
      alert("나이와 성별을 선택해주세요."); return;
    }
    
    if (pw.length < 6) {
      alert("암호는 6자리 이상이어야 합니다."); return;
    }

    // 🚀 DB를 조회하지 않고 바로 이메일을 만들어냅니다! (속도 2배 향상)
    const email = generateEmail(name);

    try {
      if (isSignupMode) {
        // --- [회원가입] ---
        // 1. 이미 있는 닉네임인지 체크 (가입 때는 안전을 위해 체크)
        const userRef = doc(db, "users_map", name); // users_map이라는 별도 명단 사용
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          alert("이미 존재하는 닉네임입니다."); return;
        }

        // 2. 계정 생성
        const userCredential = await createUserWithEmailAndPassword(auth, email, pw);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });

        // 3. DB 저장 (유저 정보 + 닉네임 점유 명단)
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name,
          email: email,
          age: signupData.age,
          gender: signupData.gender,
          createdAt: new Date(),
        });
        
        // 닉네임 중복 방지용 문서 생성 (매우 가벼움)
        await setDoc(doc(db, "users_map", name), { uid: user.uid });

        alert(`${name}님, 가입을 축하합니다!`);
      } else {
        // --- [로그인] ---
        // ⚡️ DB 조회 없이 바로 로그인 시도! (여기가 빨라진 이유)
        await signInWithEmailAndPassword(auth, email, pw);
      }
    } catch (error) {
      console.error("인증 에러:", error);
      if (error.code === 'auth/wrong-password') alert("암호가 틀렸습니다.");
      else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') alert("존재하지 않는 닉네임이거나 암호가 틀렸습니다.");
      else if (error.code === 'auth/email-already-in-use') alert("이미 사용 중인 닉네임입니다.");
      else alert("오류가 발생했습니다: " + error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="w-full max-w-sm bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-indigo-600 rounded-full shadow-lg"><Lock size={32} /></div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">{isSignupMode ? '회원가입' : '입장하기'}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">닉네임</label>
            <input 
              type="text" value={name} 
              onFocus={() => isSignupMode && setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              onChange={(e) => setName(e.target.value)} 
              onKeyDown={handleKeyDown}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none text-white" 
              placeholder="닉네임 입력" 
            />
            {isSignupMode && showTooltip && (
              <p className="text-xs text-indigo-400 mt-1">* 한글, 영문, 숫자 자유롭게 사용 가능</p>
            )}
          </div>

          {isSignupMode && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">연령대</label>
                <select
                  value={signupData.age}
                  onChange={(e) => setSignupData(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none text-white"
                >
                  <option value="" disabled>선택</option>
                  {ageOptions.map((age) => <option key={age} value={age} className="bg-gray-800">{age}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">성별</label>
                <div className="flex gap-2 h-[50px]">
                  {['male', 'female'].map((g) => (
                    <button 
                      key={g} type="button"
                      onClick={() => setSignupData(prev => ({ ...prev, gender: g }))} 
                      className={`flex-1 rounded font-bold border transition-all ${signupData.gender === g ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                    >
                      {g === 'male' ? '남' : '여'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">암호 (6자리 이상)</label>
            <input
              type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={handleKeyDown}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 outline-none text-white font-mono"
              placeholder="******"
            />
          </div>

          <button onClick={handleAuthAction} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-bold text-lg mt-4 transition shadow-lg">
            {isSignupMode ? '가입하기' : '입장하기'}
          </button>
          
          <p className="text-center text-sm text-gray-400 mt-4">
             {isSignupMode ? '이미 계정이 있으신가요?' : '처음 오셨나요?'}
             <button onClick={() => setIsSignupMode(!isSignupMode)} className="ml-2 text-indigo-400 font-bold hover:underline">
               {isSignupMode ? '로그인' : '회원가입'}
             </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;