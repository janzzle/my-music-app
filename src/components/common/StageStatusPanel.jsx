import React from 'react';

const StageStatusPanel = ({ stageInfo, isBroadcast = false, hasVoted = false, onVoteClick }) => {
  const isVotingTime = stageInfo?.status === 'playing' || stageInfo?.status === 'voting';

  if (isVotingTime) {
    if (isBroadcast) {
      return (
        <div className="w-[90%] max-w-sm shrink-0">
          <div className="relative w-full bg-black/80 border-4 border-pink-500 rounded-xl p-4 text-center shadow-[0_0_30px_#ec4899] animate-bounce-slight flex flex-col items-center">
            <div className="absolute -top-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border border-white">NOW VOTING</div>
            <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400 tracking-wider drop-shadow-sm">투표 진행 중!</h2>
            <p className="text-pink-200 text-xs mt-1 font-bold tracking-widest">여러분의 선택을 기다립니다</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-[90%] max-w-sm shrink-0 flex flex-col items-center gap-2">
          {!hasVoted ? (
            <button
              onClick={onVoteClick}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-full font-black shadow-xl border-2 border-white flex items-center justify-center gap-2 hover:scale-105 transition-transform animate-bounce text-lg md:text-xl"
            >
              <span>🔥 지금은 투표 시간!</span>
              <span className="text-sm bg-white text-pink-500 px-2 py-0.5 rounded-full">GO</span>
            </button>
          ) : (
            <button disabled className="w-full bg-gray-800 text-green-400 py-4 rounded-full font-bold shadow-lg border border-gray-600 cursor-default flex items-center justify-center gap-2 text-lg md:text-xl">
              <span>✅ {stageInfo?.songTitle} 투표 완료</span>
            </button>
          )}
        </div>
      );
    }
  }

  // 대기 중 또는 종료 상태 (두 화면 공통, 폰트 크기 크게 통일)
  return (
    <div className="w-[90%] max-w-sm shrink-0">
      <div className="w-full bg-gray-900/90 border-2 border-gray-600 rounded-xl p-4 text-center shadow-lg backdrop-blur-md flex items-center justify-center">
        <h2 className="text-lg md:text-xl font-bold text-gray-500 tracking-wider">
          {stageInfo?.status === 'ended' ? "⛔️ 투표가 종료되었습니다" : "⏳ 다음 곡 대기 중..."}
        </h2>
      </div>
    </div>
  );
};

export default StageStatusPanel;