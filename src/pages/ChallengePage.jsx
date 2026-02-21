import React, { useState } from 'react';
import { useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { PenTool, Link2, Music, User, Clock } from 'lucide-react';
// 👇 [추가] Firebase 연동을 위한 임포트
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';

const ChallengePage = () => {
  // 👇 [추가] 입력값을 관리하기 위한 State 선언
  const [artist, setArtist] = useState('');
  const [song, setSong] = useState('');
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 👇 [추가] 제출 핸들러 함수
  const [pendingChallenge, setPendingChallenge] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userTickets, setUserTickets] = useState(0);
  const [hasUsedDailyFree, setHasUsedDailyFree] = useState(false);
  const [noTickets, setNoTickets] = useState(false);

  // 🚨 [추가] 1인 1대기열 방어 로직 (DB 감시)
  useEffect(() => {
    const checkPending = () => {
      // 로그인이 안 되어 있다면 로딩 해제 후 리턴
      if (!auth.currentUser) {
        setIsLoading(false);
        return;
      }

      // 내 UID로 신청된 곡 중, 상태가 'pending(대기 중)'인 것만 찾습니다.
      const q = query(
        collection(db, "challenges"),
        where("uid", "==", auth.currentUser.uid),
        where("status", "==", "pending")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchUserTickets = async () => {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const todayStr = new Date().toDateString();

            const usedFreeToday = data.lastFreeTicketDate === todayStr;
            setHasUsedDailyFree(usedFreeToday);
            setUserTickets(data.extraTickets || 0);

            if (!snapshot.empty) {
              setPendingChallenge({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
              setNoTickets(false);
            } else if (usedFreeToday && (data.extraTickets || 0) <= 0) {
              setPendingChallenge(null);
              setNoTickets(true);
            } else {
              setPendingChallenge(null);
              setNoTickets(false);
            }
          }
          setIsLoading(false);
        };
        fetchUserTickets();
      });

      return unsubscribe;
    };

    // Firebase Auth 정보가 로드될 시간을 살짝 확보한 뒤 체크 실행
    const timer = setTimeout(checkPending, 500);
    return () => clearTimeout(timer);
  }, []);

  // 👇 [추가] 제출 핸들러 함수
  const handleSubmit = async () => {
    // 1. 로그인 체크 (필요 시)
    if (!auth.currentUser) {
      alert("로그인이 필요한 서비스입니다.");
      return;
    }

    // 2. 필수값 검사
    if (!artist.trim() || !song.trim()) {
      alert("가수와 노래 제목은 필수 입력 사항입니다!");
      return;
    }

    setIsSubmitting(true); // 로딩 시작

    try {
      // 3. Firebase에 저장
      await addDoc(collection(db, "challenges"), {
        uid: auth.currentUser.uid,
        applicantName: auth.currentUser.displayName || "익명",
        artist: artist.trim(),
        song: song.trim(),
        link: link.trim(),    // 링크 필드 추가됨
        message: message.trim(),
        status: 'pending',    // 대기 상태
        createdAt: serverTimestamp()
      });

      // 4. 티켓 차감 로직
      const userRef = doc(db, "users", auth.currentUser.uid);
      const todayStr = new Date().toDateString();
      if (!hasUsedDailyFree) {
        await updateDoc(userRef, { lastFreeTicketDate: todayStr });
      } else if (userTickets > 0) {
        await updateDoc(userRef, { extraTickets: userTickets - 1 });
      }
      alert("신청이 접수되었습니다! 감사합니다. 🎉");

      // 4. 입력창 초기화
      setArtist('');
      setSong('');
      setLink('');
      setMessage('');

    } catch (error) {
      console.error("신청 에러:", error);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false); // 로딩 끝
    }
  };

  return (
    <div className="w-full px-4 md:px-6 max-w-2xl mx-auto min-h-screen overflow-y-auto pt-20 pb-32">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black mb-2 text-gray-900">✨ 도전 신청</h2>
        <p className="text-gray-500 text-sm">당신의 숨은 인생곡을 세상에 소개해주세요.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-indigo-500 font-bold animate-pulse text-lg">상태를 확인하는 중...</div>
        </div>
      ) : noTickets ? (
        // 🚨 일일 티켓을 모두 소진했을 때
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🎫</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">도전 신청 기회를 모두 사용했습니다!</h2>
          <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
            매일 1회의 신청 기회가 제공됩니다.<br />
            추가 신청을 원하시면 관리자에게 요청하세요.
          </p>
        </div>
      ) : pendingChallenge ? (
        // 🚨 이미 대기 중인 신청곡이 있을 때 (폼 숨김)
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 md:w-10 md:h-10 text-indigo-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">이미 대기 중인 신청곡이 있습니다!</h2>
          <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
            재신청을 원할 경우 내 신청내역에서 삭제 후 다시 신청할 수 있습니다.<br />

          </p>

          <div className="w-full bg-indigo-50 border-2 border-indigo-200 rounded-xl p-5 text-center shadow-inner">
            <span className="text-xs font-black text-white bg-indigo-500 px-3 py-1 rounded-full inline-block mb-3 shadow-sm">
              ⏳ 현재 대기 중인 곡
            </span>
            <div className="font-black text-2xl text-indigo-700 mb-1 truncate">
              🎵 {pendingChallenge.artist}
            </div>
            <div className="font-bold text-lg text-gray-800 truncate">
              {pendingChallenge.song}
            </div>
            {pendingChallenge.message && (
              <div className="text-xs text-gray-600 italic bg-white border border-gray-200 p-3 rounded-lg mt-4 shadow-sm text-left">
                " {pendingChallenge.message} "
              </div>
            )}
          </div>
        </div>
      ) : (
        // ✅ 대기 중인 곡이 없을 때 보여주는 신청 폼
        <form className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6" onSubmit={(e) => e.preventDefault()}>

          {/* 1. 가수 입력 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> 가수 이름
            </label>
            <input
              type="text"
              value={artist} // 👈 연결
              onChange={(e) => setArtist(e.target.value)} // 👈 연결
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              placeholder="예: 박효신, 아이유..."
            />
          </div>

          {/* 2. 노래 제목 입력 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Music className="w-4 h-4 md:w-5 md:h-5 text-pink-500" /> 노래 제목
            </label>
            <input
              type="text"
              value={song} // 👈 연결
              onChange={(e) => setSong(e.target.value)} // 👈 연결
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-200 outline-none transition-all"
              placeholder="곡명을 정확하게 입력해주세요"
            />
          </div>

          {/* 3. 링크 입력 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4 md:w-5 md:h-5 text-blue-500" /> 유튜브/음원 링크
            </label>
            <input
              type="text"
              value={link} // 👈 연결
              onChange={(e) => setLink(e.target.value)} // 👈 연결
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              placeholder="https://youtu.be/..."
            />
          </div>

          {/* 4. 사연 입력 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <PenTool className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" /> 추천 사연
            </label>
            <textarea
              value={message} // 👈 연결
              onChange={(e) => setMessage(e.target.value)} // 👈 연결
              className="w-full p-4 h-40 bg-gray-50 border border-gray-200 rounded-xl focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-200 outline-none resize-none transition-all leading-relaxed"
              placeholder="이 노래를 추천하는 이유, 가수와의 에피소드, 곡에 얽힌 나만의 추억 등을 자유롭게 적어주세요. (구체적일수록 선정 확률 UP!)"
            ></textarea>
          </div>

          {/* 제출 버튼 */}
          <button
            type="button"
            onClick={handleSubmit} // 👈 핸들러 연결
            disabled={isSubmitting} // 👈 전송 중 중복 클릭 방지
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-95
              ${isSubmitting ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
            `}
          >
            {isSubmitting ? '전송 중...' : '도전 신청하기'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ChallengePage;