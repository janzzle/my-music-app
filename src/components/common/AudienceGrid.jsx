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
                // 🚨 본인 확인 (기본 객석의 '나')
                const isMe = currentUser?.uid && u?.id === currentUser?.uid;

                // 🚨 불빛(형광등) 노출 조건
                // isBlindActive가 true(블라인드 모드)일 때: 
                // -> 내가 기본객석의 '나'라면? 내 불빛은 즉시 공개 (isMe && u.voted)
                // -> 다른 사람이거나 송출용(currentUser 없음)이라면? 점수 공개 후( !scoreHidden )에만 노출
                // isBlindActive가 false(실시간 모드)일 때: 무조건 투표 즉시 노출 (u.voted)
                const showLight = isBlindActive 
                    ? (isMe ? (u?.voted || u.voted) : (!stageInfo?.scoreHidden && (u?.voted || u.voted))) 
                    : (u?.voted || u.voted);
                
                const isChallenger = stageInfo?.challengerUid === u?.id && (stageInfo?.status === 'playing' || stageInfo?.status === 'voting');
                
                // 🚨 랭킹 확인 (닉네임 기준으로 매칭)
                const dRank = (dailyTopUsers || []).findIndex(t => t.name === u?.name);
                const mRank = (monthlyTopUsers || []).findIndex(t => t.name === u?.name);

                const isDailyTop1 = dRank === 0;
                const isDailyTop2 = dRank === 1;
                const isDailyTop3 = dRank === 2;
                
                const isMonthlyTop1 = mRank === 0;
                const isMonthlyTop2 = mRank === 1;
                const isMonthlyTop3 = mRank === 2;
                const isMonthlyTop = mRank !== -1 && mRank < 3; 
                const currentMonthNum = new Date().getMonth() + 1;

                // 🚨 월간 1, 2, 3위에 따른 뱃지 색상 (좌측 부착)
                let monthlyBadgeStyle = "bg-indigo-500 border-indigo-300 text-white";
                if (isMonthlyTop1) monthlyBadgeStyle = "bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-200 text-black";
                else if (isMonthlyTop2) monthlyBadgeStyle = "bg-gradient-to-r from-gray-300 to-gray-400 border-gray-100 text-black";
                else if (isMonthlyTop3) monthlyBadgeStyle = "bg-gradient-to-r from-orange-400 to-orange-600 border-orange-200 text-white";

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
                    
                    {/* 🚨 아이콘 박스 (테두리 빛 삭제, '나(isMe)'일 때만 아이콘 안쪽에서 파란 빛 은은하게) */}
                    <div className={`relative z-20 p-1.5 rounded-full mb-1 border-2 border-gray-700 bg-gray-800 ${isChallenger ? 'ring-2 ring-pink-400/50' : ''} ${isMe ? 'shadow-[0_0_15px_rgba(59,130,246,0.6)]' : ''}`}>
                      <User size={16} className={isMe ? 'text-blue-400' : 'text-gray-400'} />
                    </div>
                    
                    {/* 🚨 이름표 (여기에만 은은한 테두리 빛 적용) */}
                    <div className="relative flex items-center z-20 mt-1">
                      {/* [👇 조절 가이드] text-[5px]로 초소형화하고 위치를 아이콘 좌측 상단으로 뺐습니다. -left-3은 왼쪽 위치, -top-1은 위쪽 위치, text-[6px]는 글자 크기, px-1은 가로 여백입니다.*/}
                      {isMonthlyTop && <span className={`absolute -left-4 -top-6 text-[5px] font-black px-1 py-[1px] rounded shadow-sm transform -rotate-[20deg] z-30 border ${monthlyBadgeStyle}`}>{currentMonthNum}월 Top</span>}
                      
                      {/* [👇 조절 가이드] max-w-[50px] 숫자를 늘리면 긴 이름이 덜 잘리지만 겹칠 수 있습니다. */}
                      <span className={`text-[9px] px-2 py-1 rounded-full font-bold tracking-tighter truncate max-w-[50px] border transition-all
                        ${isChallenger ? 'bg-pink-600 text-white border-pink-400 shadow-[0_0_10px_#ec4899]' : 
                          isDailyTop1 ? 'bg-gray-900 text-yellow-400 border-yellow-500/60 shadow-[0_0_8px_rgba(234,179,8,0.5)]' :
                          isDailyTop2 ? 'bg-gray-900 text-gray-200 border-gray-400/60 shadow-[0_0_8px_rgba(209,213,219,0.5)]' :
                          isDailyTop3 ? 'bg-gray-900 text-orange-300 border-orange-500/60 shadow-[0_0_8px_rgba(249,115,22,0.5)]' :
                          isMe ? 'bg-blue-600 text-white border-blue-400' : 'bg-black/60 text-white border-gray-600/50 backdrop-blur-sm'
                        }
                      `}>
                        {u?.name || '익명'}
                      </span>
                    </div>
                  </div>
                );
              })}
    </div>
  );
};

export default AudienceGrid;