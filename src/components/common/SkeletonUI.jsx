import React from 'react';

const SkeletonUI = () => {
  return (
    <div className="w-full flex flex-col items-center gap-6 py-10 px-4 animate-pulse">
      {/* 1. 스테이지 상단 정보 스켈레톤 */}
      <div className="w-[90%] md:w-[85%] max-w-5xl h-48 md:h-64 bg-gray-800 rounded-2xl border-4 border-gray-700 mx-auto opacity-50 shadow-lg"></div>

      {/* 2. 객석(AudienceGrid) 스켈레톤 */}
      <div className="w-full max-w-7xl px-4 md:px-8 mt-10">
        <div className="grid grid-cols-5 md:grid-cols-8 gap-4 place-items-center">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-700/50"></div>
              <div className="w-16 h-4 bg-gray-700/40 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 하단 UI 영역 스켈레톤 */}
      <div className="w-full flex justify-between items-end px-8 mt-12 gap-8">
        <div className="w-1/3 h-12 bg-gray-800 rounded"></div>
        <div className="w-1/3 h-20 bg-gray-800 rounded"></div>
      </div>
    </div>
  );
};

export default SkeletonUI;
