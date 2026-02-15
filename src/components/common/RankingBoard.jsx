import React from 'react';

const RankingBoard = ({ leaderboard = [] }) => {
  return (
    <div className="bg-black/80 border-2 border-gray-600 p-4 rounded-xl shadow-2xl w-[90%] max-w-sm md:w-80 backdrop-blur-md shrink-0">
      <h3 className="text-green-400 text-lg md:text-xl font-bold mb-3 md:mb-4 border-b-2 border-gray-500 pb-2 flex justify-between items-center">
        <span>🏆 실시간 순위</span>
      </h3>
      <ul className="space-y-3">
        {(!leaderboard || leaderboard.length === 0) ? (
            <li className="text-gray-400 text-sm text-center py-4">아직 집계된 순위가 없습니다.</li>
          ) : (
            // 🚨 최대 5개까지만 자르고, 4~5번째 항목(idx 3, 4)은 모바일에서 숨김(hidden md:flex) 처리
            leaderboard.slice(0, 5).map((item, idx) => (
              <li key={item?.stageId || idx} className={`items-center justify-between border-b border-gray-700/50 pb-2 animate-fade-in-up ${idx >= 3 ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                <span className={`font-bold italic text-lg md:text-xl ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : 'text-orange-400'}`}>
                  {idx + 1}
                </span>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm md:text-base leading-tight truncate max-w-[140px] md:max-w-[200px]">
                    {item.songTitle}
                  </span>
                </div>
              </div>
              <span className="bg-gray-700 px-2 py-1 rounded text-white text-xs md:text-sm font-mono shadow-inner whitespace-nowrap">
                {item.points}점
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default RankingBoard;