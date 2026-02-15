import React from 'react';
import { User } from 'lucide-react';

const AudienceGrid = ({ audienceList = [], stageInfo = {}, isBlindActive, dailyTopUsers = [], monthlyTopUsers = [], currentUser = null }) => {
  const count = audienceList?.length || 0;
  let gridClass = "grid-cols-4 md:grid-cols-6 gap-2 md:gap-3";
  let scaleClass = "scale-90 md:scale-110";

  if (count > 50) {
    gridClass = "grid-cols-8 md:grid-cols-12 gap-1 md:gap-2";
    scaleClass = "scale-50 md:scale-75"; 
  } else if (count > 24) {
    gridClass = "grid-cols-6 md:grid-cols-10 gap-1.5 md:gap-2";
    scaleClass = "scale-75 md:scale-90"; 
  }

  return (
    <div className={`grid ${gridClass} transform ${scaleClass} origin-top transition-all duration-500`}>
      {(audienceList || []).map((u) => {
                // 🚨 블라인드 모드 시: '나(isMe)'이면서 '투표를 완료(voted)' 했을 때만 내 불빛이 보임
                // 주의: props 이름이 currentUser로 넘어오므로 currentUser.uid를 사용합니다.
                const isMe = currentUser?.uid && u?.id === currentUser?.uid;
                const showLight = isBlindActive ? (isMe && (u?.voted || u.voted)) : (u?.voted || u.voted);
                
                // 🚨 도전자 판별
                const isChallenger = stageInfo?.challengerUid === u?.id && (stageInfo?.status === 'playing' || stageInfo?.status === 'voting');
                
                // 🚨 닉네임 기준으로 매칭하여 테스트 계정(관리자 등) 뱃지도 완벽하게 띄움
                const dRank = (dailyTopUsers || []).findIndex(t => t.name === u?.name);
                const mRank = (monthlyTopUsers || []).findIndex(t => t.name === u?.name);

                const isDailyTop1 = dRank === 0;
                const isDailyTop2 = dRank === 1;
                const isDailyTop3 = dRank === 2;
                const isMonthlyTop = mRank !== -1 && mRank < 3; // 월간 1,2,3위만
                const currentMonthNum = new Date().getMonth() + 1;

                let borderColors = "border-gray-500/30 bg-gray-800/60"; // 기본 (약간 어둡게)
                
                let ringColors = "";
                if (isDailyTop1) ringColors = "ring-2 ring-yellow-400/70 shadow-[0_0_8px_rgba(250,204,21,0.4)]";
                else if (isDailyTop2) ringColors = "ring-2 ring-gray-300/70 shadow-[0_0_8px_rgba(209,213,219,0.4)]";
                else if (isDailyTop3) ringColors = "ring-2 ring-orange-400/70 shadow-[0_0_8px_rgba(251,146,60,0.4)]";

                return (
                  <div key={u?.id || Math.random()} className="relative group flex flex-col items-center mt-10">
                    
                    {/* 도전자 아우라 */}
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
                    
                    {/* 캐릭터 아이콘 (아이콘 테두리 제거 후 심플하게) */}
                    <div className={`relative z-20 p-1.5 rounded-full mb-1 border transition-colors ${borderColors} ${ringColors} ${isChallenger ? 'ring-2 ring-pink-400/50' : ''}`}>
                      <User size={16} className={isMe ? 'text-blue-200' : isDailyTop1 ? 'text-yellow-500' : isDailyTop2 ? 'text-gray-300' : isDailyTop3 ? 'text-orange-400' : 'text-gray-400'} />
                      {/* 왕관 마크 */}
                      {isDailyTop1 && <div className="absolute -top-3 -right-2 text-base drop-shadow-md z-30">👑</div>}
                    </div>
                    
                    {/* 이름표 (🚨 닉네임 테두리에 은은한 랭킹 색상 적용 및 본인 색상 분리) */}
                    <div className="relative flex items-center z-20 mt-1">
                      {isMonthlyTop && <span className="absolute -left-5 -top-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[8px] font-black px-1 py-0.5 rounded shadow-lg transform -rotate-12 z-30 border border-indigo-300">{currentMonthNum}월</span>}
                      
                      <span className={`text-[9px] px-2 py-1 rounded-full font-bold tracking-tighter truncate max-w-[60px] border shadow-sm transition-all
                        ${isMe ? 'bg-blue-600/90 text-white border-blue-400' : 
                          isChallenger ? 'bg-pink-600 text-white border-pink-400 shadow-[0_0_10px_#ec4899]' : 
                          isDailyTop1 ? 'bg-black/80 text-yellow-400 border-yellow-500/50 shadow-[0_0_6px_rgba(234,179,8,0.3)]' :
                          isDailyTop2 ? 'bg-black/80 text-gray-200 border-gray-400/50 shadow-[0_0_6px_rgba(209,213,219,0.3)]' :
                          isDailyTop3 ? 'bg-black/80 text-orange-300 border-orange-500/50 shadow-[0_0_6px_rgba(249,115,22,0.3)]' :
                          'bg-black/60 text-white border-gray-600/50 backdrop-blur-sm'
                        }
                      `}>
                        {u?.name || u?.name === '나' ? u?.name : '익명'}
                      </span>
                    </div>
                  </div>
                );
              })}
    </div>
  );
};

export default AudienceGrid;