import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Edit3, Trash2, Clock, CheckCircle, Trophy, Users, Star, HelpCircle, ThumbsUp } from 'lucide-react';

const MyPage = () => {
  const [myChallenges, setMyChallenges] = useState([]);
  const [stats, setStats] = useState({ totalScore: 0, bestSong: null, totalPlayed: 0, totalUnknown: 0, totalLike: 0 });
  const [demographics, setDemographics] = useState({ age: {}, gender: { male: 0, female: 0 } });
  
  // 🚨 [추가] 각 무대별(곡별) 상세 평가 데이터를 담는 객체
  const [songStats, setSongStats] = useState({});

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // 1. 내 도전 신청 내역 실시간 렌더링
    const q = query(collection(db, "challenges"), where("uid", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setMyChallenges(list);
    });

    // 2. 통합 통계 및 무대별 세부 통계 로드
    const fetchStats = async () => {
      try {
        const resQuery = query(collection(db, "stage_results"), where("challengerUid", "==", uid));
        const resSnap = await getDocs(resQuery);
        let totalPts = 0; let highestPts = -1; let best = null;
        
        // 무대별 기본 점수 정보 초기화
        const sStats = {};

        resSnap.forEach(d => {
          const data = d.data();
          totalPts += (data.points || 0);
          if (data.points > highestPts) { highestPts = data.points; best = data.songTitle; }
          
          // 각 무대의 고유값(stageId)을 키로 사용하여 세부 데이터 기록
          sStats[data.stageId] = { 
            points: data.points || 0, voteCount: data.voteCount || 0, 
            unknown: 0, like: 0, ages: {}, genders: { male: 0, female: 0 } 
          };
        });

        // 투표자들의 연령/성별 파악을 위해 전체 유저 정보 캐싱
        const userQuery = query(collection(db, "users"));
        const userSnap = await getDocs(userQuery);
        const userDict = {};
        userSnap.forEach(d => { userDict[d.id] = d.data(); });

        const voteQuery = query(collection(db, "votes"), where("challengerUid", "==", uid));
        const voteSnap = await getDocs(voteQuery);
        
        let unknownCnt = 0; let likeCnt = 0;
        const ageCount = {}; const genderCount = { male: 0, female: 0 };

        voteSnap.forEach(v => {
          const data = v.data();
          const sid = data.stageId;

          // 🚨 [핵심 규칙] stageId(고유값)가 없거나 일치하는 무대가 아니면 즉시 무시! (가수-제목 우회 매칭 절대 금지)
          if (!sid || !sStats[sid]) return; 

          if (data.choices?.isUnknown) unknownCnt++;
          if (data.choices?.isLike) likeCnt++;

          const voterInfo = userDict[data.uid];
          if (voterInfo) {
            // 전체 대시보드 누적
            if (voterInfo.age) ageCount[voterInfo.age] = (ageCount[voterInfo.age] || 0) + 1;
            if (voterInfo.gender === 'male') genderCount.male++;
            if (voterInfo.gender === 'female') genderCount.female++;

            // 🚨 고유값이 일치하는 개별 무대 통계에만 안전하게 누적
            if (data.choices?.isUnknown) sStats[sid].unknown++;
            if (data.choices?.isLike) sStats[sid].like++;
            if (voterInfo.age) sStats[sid].ages[voterInfo.age] = (sStats[sid].ages[voterInfo.age] || 0) + 1;
            if (voterInfo.gender === 'male') sStats[sid].genders.male++;
            if (voterInfo.gender === 'female') sStats[sid].genders.female++;
          }
        });

        setStats({ totalScore: totalPts, bestSong: best, totalPlayed: resSnap.size, totalUnknown: unknownCnt, totalLike: likeCnt });
        setDemographics({ age: ageCount, gender: genderCount });
        setSongStats(sStats);

      } catch (error) { console.error("통계 로딩 실패", error); }
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
    await updateDoc(doc(db, "challenges", item.id), { artist: newArtist, song: newSong, message: newMessage || '' });
    alert("수정 완료되었습니다.");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 이 도전 신청을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "challenges", id));
  };

  const getTopAgeGroup = (ageObj) => {
    const sorted = Object.entries(ageObj).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : '데이터 부족';
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto min-h-screen pt-20 pb-24 font-sans">
      <h2 className="text-2xl md:text-3xl font-black mb-6 text-gray-900 border-b-4 border-indigo-500 inline-block pb-2">마이 페이지</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 md:p-6 rounded-2xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
          <Trophy size={100} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
          <div>
            <div className="flex items-center gap-2 text-indigo-200 mb-1 font-bold text-sm md:text-base"><Trophy size={18}/> 누적 획득 점수</div>
            <div className="text-4xl md:text-5xl font-black">{stats.totalScore}<span className="text-base font-medium ml-1">점</span></div>
          </div>
          <div className="mt-6 flex gap-4 text-xs md:text-sm bg-black/20 p-3 rounded-xl backdrop-blur-sm relative z-10">
            <div className="flex-1 border-r border-white/20">
              <span className="opacity-80 block mb-1">총 무대 진행</span>
              <span className="font-bold text-lg">{stats.totalPlayed}회</span>
            </div>
            <div className="flex-1 border-r border-white/20 text-cyan-300">
              <span className="flex items-center gap-1 opacity-80 mb-1"><HelpCircle size={12}/> 처음 들어요</span>
              <span className="font-bold text-lg">{stats.totalUnknown}개</span>
            </div>
            <div className="flex-1 text-pink-300">
              <span className="flex items-center gap-1 opacity-80 mb-1"><ThumbsUp size={12}/> 노래 좋아요</span>
              <span className="font-bold text-lg">{stats.totalLike}개</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-5 rounded-2xl shadow-xl text-white flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-pink-200 mb-1 font-bold text-sm"><Star size={16}/> 나의 역대 최고 흥행곡</div>
            <div className="text-xl md:text-2xl font-black truncate leading-tight">{stats.bestSong || '아직 기록이 없어요'}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-gray-500 mb-3 font-bold text-sm"><Users size={16}/> 내 선곡을 지지한 팬층</div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] md:text-xs text-gray-400 mb-1">가장 많은 연령대</div>
                <div className="text-lg md:text-xl font-black text-indigo-600">{getTopAgeGroup(demographics.age)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] md:text-xs text-gray-400 mb-1">성별 비율 (건)</div>
                <div className="text-sm font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded">남 {demographics.gender.male} <span className="text-gray-300">|</span> 여 {demographics.gender.female}</div>
              </div>
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
            {myChallenges.map(item => {
              const sData = songStats[item.id]; // 이 곡에 대한 상세 데이터

              return (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:border-indigo-300 transition-colors">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

                {/* 🚨 [추가] 무대가 완료된 곡에만 상세 평가 현황판 노출 */}
                {item.status === 'completed' && sData && (
                  <div className="w-full bg-gray-50 rounded-lg p-4 mt-2 border border-gray-200">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><BarChart size={14}/> 이 곡의 상세 평가</span>
                      <span className="text-sm font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">총 {sData.points}점 획득</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="bg-white p-2 rounded shadow-sm border border-gray-100">
                        <div className="text-[10px] text-gray-400 mb-1 flex justify-center items-center gap-1"><HelpCircle size={10}/> 처음 들어요</div>
                        <div className="font-bold text-cyan-600 text-sm">{sData.unknown}표</div>
                      </div>
                      <div className="bg-white p-2 rounded shadow-sm border border-gray-100">
                        <div className="text-[10px] text-gray-400 mb-1 flex justify-center items-center gap-1"><ThumbsUp size={10}/> 노래 좋아요</div>
                        <div className="font-bold text-pink-600 text-sm">{sData.like}표</div>
                      </div>
                      <div className="bg-white p-2 rounded shadow-sm border border-gray-100">
                        <div className="text-[10px] text-gray-400 mb-1">최다 지지 연령대</div>
                        <div className="font-bold text-gray-700 text-sm">{getTopAgeGroup(sData.ages)}</div>
                      </div>
                      <div className="bg-white p-2 rounded shadow-sm border border-gray-100">
                        <div className="text-[10px] text-gray-400 mb-1">성별 비율</div>
                        <div className="font-bold text-gray-700 text-[11px] mt-1">남 {sData.genders.male} : 여 {sData.genders.female}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage;