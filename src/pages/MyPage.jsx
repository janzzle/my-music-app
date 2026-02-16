import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Edit3, Trash2, Clock, CheckCircle, Trophy, Users, Star, HelpCircle, ThumbsUp, BarChart } from 'lucide-react';

const MyPage = () => {
  const [myChallenges, setMyChallenges] = useState([]);
  const [stats, setStats] = useState({ totalScore: 0, bestSong: null, totalPlayed: 0, totalUnknown: 0, totalLike: 0 });
  const [demographics, setDemographics] = useState({ age: {}, gender: { male: 0, female: 0 } });
  
  const [songStats, setSongStats] = useState({});

  // 🚨 [추가] 수정 및 삭제를 위한 인라인 UI 상태 (prompt/confirm 완벽 대체용)
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ artist: '', song: '', message: '' });
  const [deleteId, setDeleteId] = useState(null);

  // 리스트 항목별 아코디언(열기/닫기) 상태
  const [expandedItems, setExpandedItems] = useState({});
  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  // 1. 내 도전 신청 내역 실시간 렌더링
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, "challenges"), where("uid", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setMyChallenges(list);
    });
    return () => unsubscribe();
  }, []);

  // 2. 신청 내역(myChallenges)이 도착하면, 그 고유값을 바탕으로 통계 매칭 시작
  useEffect(() => {
    if (myChallenges.length === 0) return;

    const fetchStats = async () => {
      try {
        const completedIds = myChallenges.filter(c => c.status === 'completed').map(c => c.id);
        if (completedIds.length === 0) return; // 완료된 무대가 없으면 통계 생략

        const chunks = [];
        for (let i = 0; i < completedIds.length; i += 10) {
          chunks.push(completedIds.slice(i, i + 10));
        }

        let totalPts = 0; let highestPts = -1; let best = null;
        const sStats = {};
        let unknownCnt = 0; let likeCnt = 0;
        const ageCount = {}; const genderCount = { male: 0, female: 0 };

        const userQuery = query(collection(db, "users"));
        const userSnap = await getDocs(userQuery);
        const userDict = {};
        userSnap.forEach(d => { userDict[d.id] = d.data(); });

        for (const chunk of chunks) {
          chunk.forEach(id => {
            sStats[id] = { 
              points: 0, voteCount: 0, 
              unknown: 0, like: 0, ages: {}, genders: { male: 0, female: 0 },
              voteTypes: { both: 0, unknownOnly: 0, likeOnly: 0 },
              // 🚨 문항별 연령/성별 통계를 위한 필드 추가
              unknownAges: {}, unknownGenders: { male: 0, female: 0 },
              likeAges: {}, likeGenders: { male: 0, female: 0 }
            };
          });

          const resQuery = query(collection(db, "stage_results"), where("stageId", "in", chunk));
          const resSnap = await getDocs(resQuery);
          const titleMap = {};
          resSnap.forEach(d => { titleMap[d.data().stageId] = d.data().songTitle; });

          const voteQuery = query(collection(db, "votes"), where("stageId", "in", chunk));
          const voteSnap = await getDocs(voteQuery);
          
          voteSnap.forEach(v => {
            const data = v.data();
            const sid = data.stageId;

            if (!sid || !sStats[sid]) return; 

            const isU = data.choices?.isUnknown;
            const isL = data.choices?.isLike;

            if (isU) { unknownCnt++; sStats[sid].unknown++; }
            if (isL) { likeCnt++; sStats[sid].like++; }

            let pts = 0;
            if (isU && isL) { pts = 4; sStats[sid].voteTypes.both++; }
            else if (isU && !isL) { pts = 1; sStats[sid].voteTypes.unknownOnly++; }
            else if (!isU && isL) { pts = 1; sStats[sid].voteTypes.likeOnly++; }
            
            sStats[sid].points += pts;
            sStats[sid].voteCount++;

            if (sStats[sid].points > highestPts) {
              highestPts = sStats[sid].points;
              best = titleMap[sid] || "최근 곡";
            }

            const voterInfo = userDict[data.uid];
            if (voterInfo) {
              if (voterInfo.age) ageCount[voterInfo.age] = (ageCount[voterInfo.age] || 0) + 1;
              if (voterInfo.gender === 'male') genderCount.male++;
              if (voterInfo.gender === 'female') genderCount.female++;

              if (voterInfo.age) sStats[sid].ages[voterInfo.age] = (sStats[sid].ages[voterInfo.age] || 0) + 1;
              if (voterInfo.gender === 'male') sStats[sid].genders.male++;
              if (voterInfo.gender === 'female') sStats[sid].genders.female++;
              
              // 🚨 문항별 분리 누적
              if (isU) {
                if (voterInfo.age) sStats[sid].unknownAges[voterInfo.age] = (sStats[sid].unknownAges[voterInfo.age] || 0) + 1;
                if (voterInfo.gender === 'male') sStats[sid].unknownGenders.male++;
                if (voterInfo.gender === 'female') sStats[sid].unknownGenders.female++;
              }
              if (isL) {
                if (voterInfo.age) sStats[sid].likeAges[voterInfo.age] = (sStats[sid].likeAges[voterInfo.age] || 0) + 1;
                if (voterInfo.gender === 'male') sStats[sid].likeGenders.male++;
                if (voterInfo.gender === 'female') sStats[sid].likeGenders.female++;
              }
            }
          });
        }
        
        totalPts = Object.values(sStats).reduce((acc, curr) => acc + curr.points, 0);

        setStats({ totalScore: totalPts, bestSong: best, totalPlayed: completedIds.length, totalUnknown: unknownCnt, totalLike: likeCnt });
        setDemographics({ age: ageCount, gender: genderCount });
        setSongStats(sStats);

      } catch (error) { console.error("통계 로딩 실패", error); }
    };

    fetchStats();
  }, [myChallenges]);

  // 🚨 [변경] Prompt 창 대신 인라인 UI(화면 내)에서 수정 처리
  const startEdit = (item) => {
    setEditId(item.id);
    setEditForm({ artist: item.artist, song: item.song, message: item.message || '' });
  };

  const saveEdit = async (id) => {
    if (!editForm.artist || !editForm.song) return alert("가수명과 노래 제목은 필수입니다.");
    await updateDoc(doc(db, "challenges", id), editForm);
    alert("수정 완료되었습니다.");
    setEditId(null);
  };

  const executeDelete = async (id) => {
    await deleteDoc(doc(db, "challenges", id));
    alert("삭제되었습니다.");
    setDeleteId(null);
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
              const sData = songStats[item.id]; 

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
                    
                    {/* 🚨 수정 폼 렌더링 영역 */}
                    {editId === item.id ? (
                      <div className="mt-2 flex flex-col gap-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        <input value={editForm.artist} onChange={e=>setEditForm({...editForm, artist: e.target.value})} className="p-2 text-sm border border-gray-300 rounded outline-none" placeholder="가수명" />
                        <input value={editForm.song} onChange={e=>setEditForm({...editForm, song: e.target.value})} className="p-2 text-sm border border-gray-300 rounded outline-none" placeholder="곡 제목" />
                        <textarea value={editForm.message} onChange={e=>setEditForm({...editForm, message: e.target.value})} className="p-2 text-sm border border-gray-300 rounded outline-none resize-none h-16" placeholder="사연" />
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => saveEdit(item.id)} className="flex-1 bg-indigo-600 text-white py-1.5 rounded text-sm font-bold shadow">저장</button>
                          <button onClick={() => setEditId(null)} className="flex-1 bg-gray-300 text-gray-700 py-1.5 rounded text-sm font-bold shadow">취소</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-base md:text-lg font-black text-gray-900 truncate">{item.artist} - {item.song}</h4>
                        {item.message && <p className="text-xs md:text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded line-clamp-2">"{item.message}"</p>}
                      </>
                    )}
                  </div>

                  {/* 🚨 대기 중 버튼 (수정, 삭제) */}
                  {item.status === 'pending' && editId !== item.id && (
                    <div className="flex flex-col items-end gap-2 w-full md:w-auto mt-2 md:mt-0">
                      <div className="flex w-full md:w-auto gap-2">
                        <button onClick={() => startEdit(item)} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">
                          <Edit3 size={14} /> 수정
                        </button>
                        <button onClick={() => setDeleteId(item.id)} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors">
                          <Trash2 size={14} /> 삭제
                        </button>
                      </div>
                      
                      {/* 🚨 인라인 삭제 확인창 */}
                      {deleteId === item.id && (
                        <div className="bg-red-100 p-2 rounded-lg text-xs font-bold text-red-700 flex items-center gap-2 mt-1 animate-fade-in w-full md:w-auto justify-between">
                          <span>정말 삭제할까요?</span>
                          <div className="flex gap-1">
                            <button onClick={() => executeDelete(item.id)} className="bg-red-600 text-white px-2 py-1 rounded shadow hover:bg-red-700">예</button>
                            <button onClick={() => setDeleteId(null)} className="bg-gray-400 text-white px-2 py-1 rounded shadow hover:bg-gray-500">아니오</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 무대가 완료된 경우 우측에 핵심 점수 및 토글 버튼 표시 */}
                  {item.status === 'completed' && sData && (
                    <div className="flex items-center w-full md:w-auto mt-2 md:mt-0 shrink-0">
                      <button 
                        onClick={() => toggleExpand(item.id)} 
                        className="w-full flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <span className="font-black text-indigo-700 text-base">{sData.points}점</span>
                        <span className="text-xs font-bold text-indigo-500 bg-white px-2 py-1 rounded shadow-sm">
                          분석 {expandedItems[item.id] ? '접기 ▲' : '보기 ▼'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 🚨 [수정] 클릭 시 열리는 문항별 상세 통계 아코디언 */}
                {item.status === 'completed' && sData && expandedItems[item.id] && (
                  <div className="w-full bg-gray-50 rounded-xl p-4 mt-2 border border-gray-200 animate-fade-in-down">
                    
                    <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><BarChart size={14}/> 종합 득표 현황</span>
                      <div className="flex gap-2">
                        <span className="text-[11px] font-black text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">❓ 처음 {sData.unknown}표</span>
                        <span className="text-[11px] font-black text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-100">❤️ 좋아요 {sData.like}표</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* 처음 들어요 분석 */}
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-cyan-700 font-bold mb-2 flex items-center gap-1.5"><HelpCircle size={16}/> 처음 들어요 선택자 ({sData.unknown}명)</div>
                        <div className="text-xs text-gray-600 bg-cyan-50/30 p-2.5 rounded border border-cyan-50">
                          <p className="mb-1"><strong className="text-gray-500 font-bold">🔥 주력 연령:</strong> <span className="text-cyan-600 font-black">{getTopAgeGroup(sData.unknownAges)}</span></p>
                          <p><strong className="text-gray-500 font-bold">👥 성별 비율:</strong> 남 {sData.unknownGenders.male} <span className="text-gray-300">|</span> 여 {sData.unknownGenders.female}</p>
                        </div>
                      </div>

                      {/* 노래 좋아요 분석 */}
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-pink-700 font-bold mb-2 flex items-center gap-1.5"><ThumbsUp size={16}/> 노래 좋아요 선택자 ({sData.like}명)</div>
                        <div className="text-xs text-gray-600 bg-pink-50/30 p-2.5 rounded border border-pink-50">
                          <p className="mb-1"><strong className="text-gray-500 font-bold">🔥 주력 연령:</strong> <span className="text-pink-600 font-black">{getTopAgeGroup(sData.likeAges)}</span></p>
                          <p><strong className="text-gray-500 font-bold">👥 성별 비율:</strong> 남 {sData.likeGenders.male} <span className="text-gray-300">|</span> 여 {sData.likeGenders.female}</p>
                        </div>
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