import React from 'react';
import { User } from 'lucide-react';
import CountdownOverlay from '../components/common/CountdownOverlay';
import AudienceGrid from '../components/common/AudienceGrid';
import RankingBoard from '../components/common/RankingBoard';
import StageStatusPanel from '../components/common/StageStatusPanel';

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

      {/* 3. 객석 (공통 컴포넌트로 대체됨) */}
      <div className="w-full flex items-start justify-center pt-4 md:pt-20 relative z-10 shrink-0 md:flex-1">
        <AudienceGrid 
          audienceList={audienceList} 
          stageInfo={stageInfo} 
          isBlindActive={isBlindActive} 
          dailyTopUsers={dailyTopUsers} 
          monthlyTopUsers={monthlyTopUsers} 
        />
      </div>

      {/* 4&5. 하단 UI 영역 (창 높이가 작아져도 서로 부딪히지 않는 반응형 컨테이너) */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center md:items-end px-4 md:px-8 mt-auto pb-6 z-40 gap-6">

        {/* 데스크탑 중앙 정렬을 맞추기 위한 투명 빈 공간 */}
        <div className="hidden md:block w-80 shrink-0"></div>

        {/* 4. 중앙 안내판 (공통 컴포넌트로 대체됨) */}
        <StageStatusPanel 
          stageInfo={stageInfo} 
          isBroadcast={true} 
        />

        {/* 5. 실시간 순위표 (공통 컴포넌트로 대체됨) */}
        <RankingBoard leaderboard={leaderboard} />
      </div>
    </div>
  );
};

export default BroadcastPage;