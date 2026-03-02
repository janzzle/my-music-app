import React, { useState } from 'react';
import { useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { PenTool, Link2, Music, User, Clock, BarChart2, X, Users } from 'lucide-react';
// 👇 [추가] Firebase 연동을 위한 임포트
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs } from 'firebase/firestore';

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

  // 👇 [추가] 접속자 통계 모달용 상태
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsData, setStatsData] = useState({
    totalCount: 0,
    genderCount: { male: 0, female: 0, unknown: 0 },
    ageCount: {}
  });

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

  // 👇 [추가] 접속자 통계 데이터 패칭 함수
  const fetchAudienceStats = async () => {
    setIsStatsLoading(true);
    setShowStatsModal(true);
    try {
      // isOnline == true 인 사용자만 불러옴
      const q = query(collection(db, "users"), where("isOnline", "==", true));
      const snapshot = await getDocs(q);

      let total = 0;
      let maleCount = 0;
      let femaleCount = 0;
      let unknownGenderCount = 0;
      const ages = {
        '10대': 0, '20대': 0, '30대': 0, '40대': 0, '50대': 0,
        '60대': 0, '70대': 0, '80대': 0, '90대 이상': 0, '미상': 0
      };

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        total++;

        // 성별 통계
        if (data.gender === 'male') maleCount++;
        else if (data.gender === 'female') femaleCount++;
        else unknownGenderCount++;

        // 연령대 통계
        const age = data.age || '미상';
        if (ages[age] !== undefined) ages[age]++;
        else ages['미상']++;
      });

      setStatsData({
        totalCount: total,
        genderCount: { male: maleCount, female: femaleCount, unknown: unknownGenderCount },
        ageCount: ages
      });

    } catch (error) {
      console.error("통계 불러오기 실패:", error);
      alert("데이터를 불러오는데 실패했습니다.");
      setShowStatsModal(false);
    } finally {
      setIsStatsLoading(false);
    }
  };

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
        <h2 className="text-3xl font-black mb-2 text-gray-900">✨ 선곡 신청</h2>
        <p className="text-gray-500 text-sm mb-4">당신의 숨은 인생곡을 세상에 소개해주세요.</p>

        {/* 👇 [추가] 통계 보기 버튼 */}
        <button
          onClick={fetchAudienceStats}
          className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-2 px-4 rounded-full text-sm transition-all shadow-sm border border-indigo-100 active:scale-95"
        >
          <BarChart2 className="w-4 h-4" />
          현재 접속자 성별/연령대 보기
        </button>
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">선곡 신청 기회를 모두 사용했습니다!</h2>
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
              className="w-full p-4 h-48 bg-gray-50 border border-gray-200 rounded-xl focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-200 outline-none resize-none transition-all leading-relaxed"
              placeholder={"이 곡을 추천하는 이유, 간략한 가수와 곡소개,\n 관련된 에피소드 그리고 곡에 얽힌 나의 이야기를 적어주세요!\n \n꼭 남들이 모르는 노래가 아니라도 좋아요.\n모두가 즐길 수 있다면 환영합니다!"}
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
            {isSubmitting ? '전송 중...' : '선곡 신청하기'}
          </button>
        </form>
      )}

      {/* 👇 [추가] 접속자 통계 모달 UI */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowStatsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>

            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Users className="w-5 h-5" />
                현재 실시간 객석 통계
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              {isStatsLoading ? (
                // 로딩 스켈레톤
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-medium animate-pulse">실시간 데이터를 분석 중입니다...</p>
                </div>
              ) : statsData.totalCount === 0 ? (
                // 접속자 없음
                <div className="text-center py-10 text-gray-500">
                  <span className="text-4xl mb-3 block opacity-50">📭</span>
                  <p className="font-bold">현재 온라인 상태인 접속자가 없습니다.</p>
                </div>
              ) : (
                // 통계 결과 표시
                <div className="space-y-6">
                  {/* 총 접속자 */}
                  <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
                    <span className="text-sm font-bold text-indigo-600 block mb-1">현재 온라인 관객</span>
                    <span className="text-3xl font-black text-gray-900">{statsData.totalCount}명</span>
                  </div>

                  {/* 성별 비율 */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 성별 비율
                    </h3>

                    <div className="flex h-6 rounded-full overflow-hidden shadow-inner mb-2 bg-gray-100">
                      {statsData.genderCount.male > 0 && (
                        <div
                          className="bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-1000"
                          style={{ width: `${(statsData.genderCount.male / statsData.totalCount) * 100}%` }}
                        >
                          {(statsData.genderCount.male / statsData.totalCount * 100).toFixed(0)}%
                        </div>
                      )}
                      {statsData.genderCount.female > 0 && (
                        <div
                          className="bg-pink-500 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-1000"
                          style={{ width: `${(statsData.genderCount.female / statsData.totalCount) * 100}%` }}
                        >
                          {(statsData.genderCount.female / statsData.totalCount * 100).toFixed(0)}%
                        </div>
                      )}
                      {statsData.genderCount.unknown > 0 && (
                        <div
                          className="bg-gray-400 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-1000"
                          style={{ width: `${(statsData.genderCount.unknown / statsData.totalCount) * 100}%` }}
                        />
                      )}
                    </div>

                    <div className="flex justify-between text-xs font-bold px-1">
                      <span className="text-blue-600">남자 {statsData.genderCount.male}명</span>
                      {statsData.genderCount.unknown > 0 && <span className="text-gray-500">미상 {statsData.genderCount.unknown}명</span>}
                      <span className="text-pink-600">여자 {statsData.genderCount.female}명</span>
                    </div>
                  </div>

                  {/* 연령대 분포 */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> 연령대 분포
                    </h3>
                    <div className="space-y-2.5">
                      {Object.entries(statsData.ageCount)
                        // 인원이 0명인 연령대는 숨기기 (옵션)
                        // eslint-disable-next-line
                        .filter(([_, count]) => count > 0)
                        .sort(([ageA], [ageB]) => ageA.localeCompare(ageB)) // 10대, 20대 순 정렬
                        .map(([age, count]) => {
                          const percent = Math.round((count / statsData.totalCount) * 100);
                          return (
                            <div key={age} className="flex items-center gap-3 text-sm">
                              <span className="w-16 font-bold text-gray-600 text-right shrink-0">{age}</span>
                              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                                <div
                                  className="absolute top-0 left-0 h-full bg-orange-400 rounded-full transition-all duration-1000"
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                              <span className="w-12 font-bold text-gray-900 text-right">{count}명</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
              <button
                onClick={() => setShowStatsModal(false)}
                className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengePage;