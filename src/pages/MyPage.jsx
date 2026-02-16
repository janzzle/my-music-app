import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Edit3, Trash2, Clock, CheckCircle, Trophy, Users, Star } from 'lucide-react';

const MyPage = () => {
  const [myChallenges, setMyChallenges] = useState([]);
  
  // 🚨 [추가] 통계 상태
  const [stats, setStats] = useState({ totalScore: 0, bestSong: null, totalPlayed: 0 });
  const [demographics, setDemographics] = useState({ age: {}, gender: { male: 0, female: 0 } });

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // 1. 기존: 대기열 신청 내역
    const q = query(collection(db, "challenges"), where("uid", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setMyChallenges(list);
    });

    // 2. 새로운 통계 데이터 불러오기 (1회성 로드)
    const fetchStats = async () => {
      try {
        // A. 내 무대 기록 (점수 및 최고 곡)
        const resQuery = query(collection(db, "stage_results"), where("challengerUid", "==", uid));
        const resSnap = await getDocs(resQuery);
        let totalPts = 0;
        let highestPts = -1;
        let best = null;
        
        resSnap.forEach(d => {
          const data = d.data();
          totalPts += (data.points || 0);
          if (data.points > highestPts) {
            highestPts = data.points;
            best = data.songTitle;
          }
        });
        setStats({ totalScore: totalPts, bestSong: best, totalPlayed: resSnap.size });

        // B. 날 평가한 사람들의 연령/성별 분석
        const userQuery = query(collection(db, "users"));
        const userSnap = await getDocs(userQuery);
        const userDict = {};
        userSnap.forEach(d => { userDict[d.id] = d.data(); });

        const voteQuery = query(collection(db, "votes"), where("challengerUid", "==", uid));
        const voteSnap = await getDocs(voteQuery);
        
        const ageCount = {};
        const genderCount = { male: 0, female: 0 };

        voteSnap.forEach(v => {
          const voterUid = v.data().uid;
          const voterInfo = userDict[voterUid];
          if (voterInfo) {
            if (voterInfo.age) {
              ageCount[voterInfo.age] = (ageCount[voterInfo.age] || 0) + 1;
            }
            if (voterInfo.gender === 'male') genderCount.male++;
            if (voterInfo.gender === 'female') genderCount.female++;
          }
        });
        setDemographics({ age: ageCount, gender: genderCount });
      } catch (error) {
        console.error("통계 로딩 실패", error);
      }
    };

    fetchStats();

    return () => unsubscribe();
  }, []);

  const handleEdit = async (item) => {
    const newArtist = prompt("가수명을 수정하세요:", item.artist);
    if (!newArtist) return;
    const newSong = prompt("곡 제목을 수정하세요:", item.song);
    if (!newSong) return;
    const newMessage = prompt("사연을 수정하세요:", item.message);

    await updateDoc(doc(db, "challenges", item.id), {
      artist: newArtist,
      song: newSong,
      message: newMessage || ''
    });
    alert("수정 완료되었습니다.");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 이 도전 신청을 삭제하시겠습니까? (삭제된 티켓은 반환되지 않을 수 있습니다)")) return;
    await deleteDoc(doc(db, "challenges", id));
  };

  // 연령대 1위 계산 로직
  const getTopAgeGroup = () => {
    const sorted = Object.entries(demographics.age).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : '분석 중 (데이터 부족)';
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto min-h-screen pt-20 pb-24 font-sans">
      <h2 className="text-2xl md:text-3xl font-black mb-6 text-gray-900 border-b-4 border-indigo-500 inline-block pb-2">마이 페이지</h2>

      {/* 🚨 [새로 추가된 대시보드 영역] */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* 누적 점수 */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 md:p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
          <Trophy size={80} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
          <div className="flex items-center gap-2 text-indigo-200 mb-2 font-bold text-sm md:text-base"><Trophy size={18}/> 누적 획득 점수</div>
          <div className="text-3xl md:text-4xl font-black">{stats.totalScore}<span className="text-base font-medium ml-1">점</span></div>
          <div className="text-xs md:text-sm mt-2 opacity-80">총 {stats.totalPlayed}번의 무대 완료</div>
        </div>

        {/* 최고 흥행곡 */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-5 md:p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
          <Star size={80} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
          <div className="flex items-center gap-2 text-pink-200 mb-2 font-bold text-sm md:text-base"><Star size={18}/> 나의 최고 흥행곡</div>
          <div className="text-lg md:text-xl font-black truncate mt-1 leading-tight">{stats.bestSong || '아직 기록이 없어요'}</div>
        </div>

        {/* 팬 통계 */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-gray-500 mb-4 font-bold text-sm"><Users size={18}/> 내 음악을 지지한 팬층</div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] md:text-xs text-gray-400 mb-1">가장 많은 연령대</div>
              <div className="text-lg md:text-xl font-black text-indigo-600">{getTopAgeGroup()}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] md:text-xs text-gray-400 mb-1">성별 비율</div>
              <div className="text-sm font-bold text-gray-700">남 {demographics.gender.male} : 여 {demographics.gender.female}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-5 md:p-6">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          🎙️ 나의 도전 신청 내역
        </h3>

        {myChallenges.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg text-sm md:text-base">아직 신청한 도전곡이 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {myChallenges.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-300 transition-colors">
                <div className="flex-1 w-full min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {item.status === 'pending' ? (
                      <span className="bg-yellow-100 text-yellow-700 text-[10px] md:text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0"><Clock size={12} /> 대기 중</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-[10px] md:text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0"><CheckCircle size={12} /> 진행 완료</span>
                    )}
                    <span className="text-[10px] md:text-xs text-gray-400 font-mono truncate">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : '최근'}
                    </span>
                  </div>
                  <h4 className="text-base md:text-lg font-black text-gray-900 truncate">{item.artist} - {item.song}</h4>
                  {item.message && <p className="text-xs md:text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded line-clamp-2">"{item.message}"</p>}
                </div>

                {item.status === 'pending' && (
                  <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onClick={() => handleEdit(item)} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">
                      <Edit3 size={14} /> 수정
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors">
                      <Trash2 size={14} /> 삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage;