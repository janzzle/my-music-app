import React from 'react';
import { User } from 'lucide-react';
import CountdownOverlay from '../components/common/CountdownOverlay';

const BroadcastPage = ({ audienceList = [], stageInfo = {}, socket, leaderboard = [], dailyTopUsers = [], monthlyTopUsers = [] }) => {
  const currentScore = audienceList.reduce((acc, u) => {
    if (!u.voted) return acc;
    // 🚨 과거 데이터 충돌 방지 안전장치
    const { isUnknown = false, isLike = false } = u.choices || {}; 
    let score = 0;
    if (isUnknown && isLike) score = 4;
    else if (isUnknown || isLike) score = 1;
    return acc + score;
  }, 0);

  // 2. 블라인드 모드 확인
  const isBlindActive = stageInfo.scoreMode === 'blind' && stageInfo.scoreHidden;

  return (
    // 전체 컨테이너: 모바일은 스크롤 가능하게 세로 나열(flex-col + gap), PC는 화면 꽉 차게(h-screen + overflow-hidden)
    <div className="relative w-full min-h-screen md:h-screen bg-gray-900 flex flex-col items-center overflow-x-hidden overflow-y-auto md:overflow-hidden pt-16 md:pt-20 pb-24 md:pb-0 gap-6 md:gap-0">

      {/* 정비 모드 오버레이 */}
      {stageInfo.maintenance && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-xl z-[90] flex flex-col items-center justify-center">
          <div className="text-yellow-400 text-6xl md:text-8xl mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">🛠️</div>
          <h1 className="text-white text-3xl md:text-5xl font-black mb-4 tracking-widest text-center drop-shadow-lg">방송 준비 중입니다</h1>
          <p className="text-gray-400 text-lg md:text-xl text-center">잠시 후 다시 시작됩니다.</p>
        </div>
      )}

      {/* 카운트다운 오버레이 */}
      <CountdownOverlay socket={socket} />

      {/* 1. LIVE 마크 (내비게이션과 동일한 top-4 라인으로 배치, 폰트 크기에 맞게 투명하게) */}
      <div className="absolute top-4 left-4 md:left-6 z-[60] text-red-500 flex items-center gap-1 font-black tracking-widest animate-pulse drop-shadow-md">
        <span className="text-xs md:text-sm drop-shadow-lg">🔴 LIVE</span>
      </div>

      {/* 2. 중앙 전광판 (내비/LIVE와 안 겹치도록 상단 여백 통일) */}
      <div className="w-[90%] md:w-[85%] max-w-5xl min-h-[200px] md:min-h-[250px] md:h-[35%] shrink-0 bg-black flex flex-col items-center justify-center border-4 md:border-8 border-gray-800 rounded-2xl shadow-[0_0_50px_rgba(100,0,255,0.2)] relative z-0 mt-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-black/90 z-10 rounded-xl"></div>

        <div className="z-20 text-center">
          <p className="text-green-400 text-[10px] md:text-xs font-mono mb-2 tracking-widest border border-green-400 px-2 inline-block animate-pulse">LIVE STAGE</p>

          <h1 className="text-2xl md:text-5xl font-black tracking-wider min-h-[40px] md:min-h-[60px] flex items-center justify-center">
            {stageInfo.status === 'countdown' && stageInfo.count > 0 && (
              <span className="text-6xl md:text-8xl text-red-500 inline-block">{stageInfo.count}</span>
            )}
            {stageInfo.status === 'ready_to_play' && <span className="opacity-0">.</span>}
            {stageInfo.status === 'playing' && stageInfo.titleHidden === true && <span className="text-white text-3xl md:text-5xl animate-custom-fade-in inline-block drop-shadow-lg">🎵 도전 곡 재생 중...</span>}
            {(stageInfo.status === 'playing' || stageInfo.status === 'voting' || stageInfo.status === 'ended') && stageInfo.titleHidden === false && (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-custom-fade-in inline-block">
                {stageInfo.songTitle || "다음 곡 대기 중"}
              </span>
            )}
            {stageInfo.status === 'ready' && <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 inline-block">{stageInfo.songTitle || "다음 곡 대기 중"}</span>}
          </h1>

          {(stageInfo.status === 'playing' || stageInfo.status === 'voting' || stageInfo.status === 'ended') && (
            <div className="mt-4 md:mt-6 animate-custom-fade-in">
              {stageInfo.scoreMode === 'blind' && stageInfo.scoreHidden ? null : (
                <span key={currentScore} className="text-4xl md:text-6xl font-black text-yellow-400 tracking-widest bg-black/60 px-8 py-2 rounded-2xl border-2 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)] animate-number-pop inline-block">
                  {currentScore} <span className="text-xl md:text-3xl text-yellow-200">점</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. 객석 (인원수에 따른 동적 스케일링 & 도전자 하이라이트 & 타이틀 테두리 적용) */}
      <div className="w-full flex items-start justify-center pt-4 md:pt-20 relative z-10 shrink-0 md:flex-1">
        
        {/* 👇 [핵심] 인원수에 따른 CSS 동적 계산 로직 */}
        {(() => {
          const count = audienceList.length;
          let gridClass = "grid-cols-4 md:grid-cols-6 gap-2 md:gap-3";
          let scaleClass = "scale-90 md:scale-110";

          if (count > 50) {
            gridClass = "grid-cols-8 md:grid-cols-12 gap-1 md:gap-2";
            scaleClass = "scale-50 md:scale-75"; // 인원이 많으면 팍 줄임
          } else if (count > 24) {
            gridClass = "grid-cols-6 md:grid-cols-10 gap-1.5 md:gap-2";
            scaleClass = "scale-75 md:scale-90"; // 중간 정도 줄임
          }

          return (
            <div className={`grid ${gridClass} transform ${scaleClass} origin-top transition-all duration-500`}>
              {audienceList.map((u) => {
                const showLight = isBlindActive ? false : (u?.voted || u.voted);
                
                const isChallenger = stageInfo?.challengerUid === u?.id && (stageInfo?.status === 'playing' || stageInfo?.status === 'voting');
                
                // 🚨 닉네임 기준으로 매칭하여 송출 화면에서도 테스트 계정 뱃지 띄움
                const dRank = (dailyTopUsers || []).findIndex(t => t.name === u?.name);
                const mRank = (monthlyTopUsers || []).findIndex(t => t.name === u?.name);

                const isDailyTop1 = dRank === 0;
                const isDailyTop2 = dRank === 1;
                const isDailyTop3 = dRank === 2;
                const isMonthlyTop = mRank !== -1 && mRank < 3; // 월간 1,2,3위만
                const currentMonthNum = new Date().getMonth() + 1;

                let borderColors = "border-gray-500/30 bg-gray-800/60"; // 기본 (은은하게)
                if (isDailyTop1) borderColors = "border-yellow-400/50 bg-yellow-500/10 shadow-[0_0_8px_rgba(250,204,21,0.2)]";
                else if (isDailyTop2) borderColors = "border-gray-300/50 bg-gray-300/10 shadow-[0_0_8px_rgba(209,213,219,0.2)]";
                else if (isDailyTop3) borderColors = "border-orange-400/50 bg-orange-500/10 shadow-[0_0_8px_rgba(251,146,60,0.2)]";

                return (
                  <div key={u?.id || Math.random()} className="relative group flex flex-col items-center mt-10">
                    
                    {/* 도전자 아우라 (은은한 핑크/보라빛 백그라운드) */}
                    {isChallenger && (
                      <div className="absolute inset-0 bg-fuchsia-500/20 blur-xl rounded-full scale-150 animate-pulse z-0"></div>
                    )}

                    {/* 형광등 스케치북 */}
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 w-20">
                      <div className={`
                        w-12 h-8 bg-gray-800 rounded-md border-2 border-gray-600 shadow-xl flex gap-0.5 p-0.5 mb-1 transform transition-all duration-500
                        ${showLight ? 'scale-110 opacity-100' : 'scale-90 opacity-0'}
                      `}>
                        <div className={`flex-1 rounded-sm transition-all duration-300 ${u?.choices?.isUnknown ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : 'bg-gray-700 opacity-20'}`}></div>
                        <div className={`flex-1 rounded-sm transition-all duration-300 ${u?.choices?.isLike ? 'bg-pink-500 shadow-[0_0_10px_pink]' : 'bg-gray-700 opacity-20'}`}></div>
                      </div>
                      <div className={`flex justify-between w-8 relative z-10 transition-all duration-500 ${showLight ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="w-1 h-5 bg-gray-300 border border-gray-400 rounded-full transform -rotate-[20deg] origin-bottom"></div>
                        <div className="w-1 h-5 bg-gray-300 border border-gray-400 rounded-full transform rotate-[20deg] origin-bottom"></div>
                      </div>
                    </div>
                    
                    {/* 캐릭터 아이콘 (타이틀 테두리 적용) */}
                    <div className={`relative z-20 p-2 rounded-full mb-1 border transition-colors ${borderColors} ${isChallenger ? 'ring-2 ring-pink-400/50' : ''}`}>
                      <User size={18} className={isDailyTop1 ? 'text-yellow-500' : isDailyTop2 ? 'text-gray-300' : isDailyTop3 ? 'text-orange-400' : 'text-gray-400'} />
                      
                      {/* 왕관/메달 마크 */}
                      {isDailyTop1 && <div className="absolute -top-3 -right-2 text-lg drop-shadow-md">👑</div>}
                      {/* 🚨 해당 월 태그 */}
                      {isMonthlyTop && <div className="absolute -left-4 -top-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md transform -rotate-12 z-30">{currentMonthNum}월</div>}
                    </div>
                    
                    {/* 이름표 */}
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-tighter truncate max-w-[60px] border z-20
                      ${isChallenger ? 'bg-pink-600 text-white border-pink-400 shadow-[0_0_10px_#ec4899]' : 'bg-black/60 text-white border-white/20 backdrop-blur-sm'}
                    `}>
                      {u.name}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 4&5. 하단 UI 영역 (창 높이가 작아져도 서로 부딪히지 않는 반응형 컨테이너) */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center md:items-end px-4 md:px-8 mt-auto pb-6 z-40 gap-6">

        {/* 데스크탑 중앙 정렬을 맞추기 위한 투명 빈 공간 */}
        <div className="hidden md:block w-80 shrink-0"></div>

        {/* 4. 중앙 안내판 */}
        <div className="w-[90%] max-w-sm shrink-0">
          {(stageInfo.status === 'playing' || stageInfo.status === 'voting') ? (
            <div className="relative w-full bg-black/80 border-4 border-pink-500 rounded-xl p-4 text-center shadow-[0_0_30px_#ec4899] animate-bounce-slight flex flex-col items-center">
              <div className="absolute -top-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border border-white">NOW VOTING</div>
              <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400 tracking-wider drop-shadow-sm">투표 진행 중!</h2>
              <p className="text-pink-200 text-xs mt-1 font-bold tracking-widest">여러분의 선택을 기다립니다</p>
            </div>
          ) : (
            <div className="w-full bg-gray-900/90 border-2 border-gray-600 rounded-xl p-3 text-center shadow-lg backdrop-blur-md">
              <h2 className="text-lg md:text-xl font-bold text-gray-500 tracking-wider">
                {stageInfo.status === 'ended' ? "⛔️ 투표가 종료되었습니다" : "⏳ 다음 곡 대기 중..."}
              </h2>
            </div>
          )}
        </div>

        {/* 5. 실시간 순위표 */}
        <div className="bg-black/80 border-2 border-gray-600 p-4 rounded-xl shadow-2xl w-[90%] max-w-sm md:w-80 backdrop-blur-md shrink-0">
          <h3 className="text-green-400 text-lg font-bold mb-3 border-b-2 border-gray-500 pb-2 flex justify-between items-center">
            <span>🏆 실시간 순위</span>
          </h3>
          <ul className="space-y-3">
            {leaderboard.length === 0 ? (
              <li className="text-gray-400 text-sm text-center py-4">아직 집계된 순위가 없습니다.</li>
            ) : (
              leaderboard.map((item, idx) => (
                <li key={item.stageId} className="flex items-center justify-between border-b border-gray-700/50 pb-2 animate-fade-in-up">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`font-bold italic text-lg ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : 'text-orange-400'}`}>
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm leading-tight truncate max-w-[140px]">
                        {item.songTitle}
                      </span>
                    </div>
                  </div>
                  <span className="bg-gray-700 px-2 py-1 rounded text-white text-xs font-mono shadow-inner whitespace-nowrap">
                    {item.points}점
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BroadcastPage;