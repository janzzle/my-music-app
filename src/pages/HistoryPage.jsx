import React, { useState, useEffect } from 'react';
import { Trophy, Music, User, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const HistoryPage = () => {
  const [allResults, setAllResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [rankDate, setRankDate] = useState(new Date());
  const [rankPeriod, setRankPeriod] = useState('daily');

  // 1. 서버 최적화된 결과 컬렉션('stage_results')에서 데이터 가져오기
  useEffect(() => {
    const q = query(collection(db, "stage_results"));
    const unsub = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach(docSnap => {
        results.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAllResults(results);
    });
    return () => unsub();
  }, []);

  // 2. 선택된 날짜와 기간에 맞춰 랭킹 필터링 및 정렬
  useEffect(() => {
    const isDateInPeriod = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const rDate = new Date(rankDate);
      
      if (rankPeriod === 'daily') {
        return d.toDateString() === rDate.toDateString();
      } else if (rankPeriod === 'monthly') {
        return d.getMonth() === rDate.getMonth() && d.getFullYear() === rDate.getFullYear();
      } else if (rankPeriod === 'weekly') {
        const startOfWeek = new Date(rDate);
        startOfWeek.setDate(rDate.getDate() - rDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return d >= startOfWeek && d <= endOfWeek;
      }
      return false;
    };

    // 필터링 적용
    const filtered = allResults.filter(data => {
      if (data.timestamp && data.timestamp.toDate) {
          return isDateInPeriod(data.timestamp.toDate());
      }
      return false;
    });

    // 점수 내림차순 정렬
    const sorted = filtered.sort((a, b) => b.points - a.points);
    setLeaderboard(sorted);
  }, [allResults, rankDate, rankPeriod]);

  // 날짜 이동 컨트롤
  const handlePrev = () => {
    const newDate = new Date(rankDate);
    if (rankPeriod === 'daily') newDate.setDate(newDate.getDate() - 1);
    else if (rankPeriod === 'weekly') newDate.setDate(newDate.getDate() - 7);
    else if (rankPeriod === 'monthly') newDate.setMonth(newDate.getMonth() - 1);
    setRankDate(newDate);
  };
  
  const handleNext = () => {
    const newDate = new Date(rankDate);
    if (rankPeriod === 'daily') newDate.setDate(newDate.getDate() + 1);
    else if (rankPeriod === 'weekly') newDate.setDate(newDate.getDate() + 7);
    else if (rankPeriod === 'monthly') newDate.setMonth(newDate.getMonth() + 1);
    setRankDate(newDate);
  };

  const getRankTitle = () => {
    if (rankPeriod === 'daily') return `${rankDate.getMonth() + 1}월 ${rankDate.getDate()}일`;
    if (rankPeriod === 'monthly') return `${rankDate.getFullYear()}년 ${rankDate.getMonth() + 1}월`;
    if (rankPeriod === 'weekly') {
      const start = new Date(rankDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getMonth() + 1}.${start.getDate()} ~ ${end.getMonth() + 1}.${end.getDate()}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full font-sans text-gray-800 pt-12 md:pt-16 pb-24">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
      
      <div className="flex flex-row items-end justify-between mb-5 border-b-2 border-gray-900 pb-3 gap-2">
        <div className="flex flex-col gap-1 shrink-0">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-1.5">
            <Trophy className="text-yellow-500" size={24} fill="currentColor" />
            오늘의 순위
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">LIVE</div>
            <p className="text-[10px] md:text-xs text-gray-500 font-bold tracking-tight">집계 완료 랭킹</p>
          </div>
        </div>

        <div className="flex flex-row items-center gap-1 overflow-hidden shrink-0">
          <select 
            value={rankPeriod} 
            onChange={(e) => setRankPeriod(e.target.value)}
            className="bg-white text-[10px] md:text-xs font-bold text-gray-700 border border-gray-300 rounded px-1.5 py-1 outline-none focus:border-indigo-500 cursor-pointer shadow-sm shrink-0"
          >
            <option value="daily">일간</option>
            <option value="weekly">주간</option>
            <option value="monthly">월간</option>
          </select>

          <div className="flex justify-between items-center bg-white rounded p-0.5 border border-gray-300 shadow-sm shrink-0">
            <button onClick={handlePrev} className="p-0.5 hover:bg-gray-100 rounded text-gray-600 transition-colors z-20 relative"><ChevronLeft size={14}/></button>
            <div className="relative flex items-center gap-0.5 px-1 cursor-pointer hover:text-indigo-600 text-gray-800 font-bold transition-colors">
              <CalendarIcon size={12} className="text-indigo-500 shrink-0" />
              <span className="text-[10px] md:text-xs text-center whitespace-nowrap min-w-[55px] tracking-tighter">{getRankTitle()}</span>
              <input 
                type={rankPeriod === 'monthly' ? "month" : "date"}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                onClick={(e) => { try { e.target.showPicker(); } catch (err) { console.log(err); } }}
                onChange={(e) => { 
                  if(e.target.value) {
                    if (rankPeriod === 'monthly') setRankDate(new Date(e.target.value + '-01T00:00:00'));
                    else setRankDate(new Date(e.target.value + 'T00:00:00'));
                  }
                }}
              />
            </div>
            <button onClick={handleNext} className="p-0.5 hover:bg-gray-100 rounded text-gray-600 transition-colors z-20 relative"><ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-4 opacity-50">📭</span>
            <p className="font-bold text-sm">해당 기간에 집계된 순위가 없습니다.</p>
          </div>
        ) : (
          leaderboard.map((item, index) => {
            return (
              <div 
                key={item.id} 
                className={`relative flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.02] shadow-sm
                  ${index === 0 ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white border-transparent shadow-xl' : 'bg-white border-gray-200 hover:border-indigo-300'}
                `}
              >
                <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
                  <div className={`flex flex-col items-center justify-center w-10 md:w-12 shrink-0 ${index === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    <span className="text-2xl md:text-3xl font-black italic">{index + 1}</span>
                    <span className="text-[10px] opacity-70 flex items-center gap-0.5 mt-0.5">-</span>
                  </div>

                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${index === 0 ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <Music size={20} className={index === 0 ? 'text-white/50' : 'text-gray-400'} />
                    </div>
                    
                    {/* 윗줄: 가수 - 곡명 / 아랫줄: 도전자 닉네임 */}
                    <div className="flex flex-col min-w-0">
                      <div className={`font-bold text-base md:text-lg truncate leading-tight ${index === 0 ? 'text-white' : 'text-gray-800'}`}>
                        {item.artist || '알 수 없음'} - {item.song || item.songTitle}
                      </div>
                      <div className={`text-xs md:text-sm truncate flex items-center gap-1 mt-0.5 ${index === 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                        <User size={12} />
                        <span className="font-medium">도전자: {item.challengerName || '익명 도전자'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right pl-2 shrink-0">
                  <div className={`text-sm font-bold ${index === 0 ? 'text-yellow-400' : 'text-indigo-600'}`}>
                    종합 점수
                  </div>
                  <div className={`text-xl md:text-2xl font-black ${index === 0 ? 'text-white' : 'text-gray-900'}`}>
                    {item.points}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="text-center mt-8 text-xs text-gray-400">
        * 노래가 완전히 종료된 후 집계된 최종 랭킹입니다.
      </div>
      </div>
    </div>
  );
};

export default HistoryPage;