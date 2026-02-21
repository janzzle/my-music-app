import React, { memo, useState, useEffect, useMemo } from 'react';
import { User } from 'lucide-react';
// 🚨 가상화 라이브러리 추가 (react-window v2부터는 통합된 Grid 사용)
import { Grid } from 'react-window';

// 1. 커스텀 훅: 창 크기 감지 (반응형 객석 구성용)
function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useEffect(() => {
    function updateSize() { setSize([window.innerWidth, window.innerHeight]); }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return size;
}

// 2. 단일 유저 아이템 컴포넌트 (React.memo 유지 렌더링 최적화)
const UserItem = memo(({ u, isMe, showLight, isChallenger, isDailyTop1, isDailyTop2, isDailyTop3, isMonthlyTop, currentMonthNum, monthlyBadgeStyle }) => (
  // 🚨 Grid 내부에 꽉 차게 들어가도록 레이아웃 조정
  <div className="relative group flex flex-col items-center justify-center w-full h-full pt-6">
    {isChallenger && (
      <div className="absolute inset-0 bg-fuchsia-500/20 blur-xl rounded-full scale-150 animate-pulse z-0"></div>
    )}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 w-16 md:w-20">
      <div className={`
        w-8 md:w-10 h-6 md:h-7 bg-gray-800 rounded-md border-2 border-gray-600 shadow-xl flex gap-0.5 p-0.5 mb-0.5 transform transition-all duration-500
        ${showLight ? 'scale-110 opacity-100' : 'scale-90 opacity-0'}
      `}>
        <div className={`flex-1 rounded-sm transition-all duration-300 ${u?.choices?.isUnknown ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : 'bg-gray-700 opacity-20'}`}></div>
        <div className={`flex-1 rounded-sm transition-all duration-300 ${u?.choices?.isLike ? 'bg-pink-500 shadow-[0_0_10px_pink]' : 'bg-gray-700 opacity-20'}`}></div>
      </div>
      <div className={`flex justify-between w-6 md:w-7 relative z-10 transition-all duration-500 ${showLight ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="w-1 h-2 md:h-3 bg-gray-300 border border-gray-400 rounded-full transform -rotate-[20deg] origin-bottom"></div>
        <div className="w-1 h-2 md:h-3 bg-gray-300 border border-gray-400 rounded-full transform rotate-[20deg] origin-bottom"></div>
      </div>
    </div>
    <div className={`relative z-20 p-1 md:p-1.5 rounded-full mb-1 border-2 border-gray-700 bg-gray-800 ${isChallenger ? 'ring-2 ring-pink-400/50' : ''} ${isMe ? 'shadow-[0_0_15px_rgba(59,130,246,0.6)]' : ''}`}>
      <User className={`w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-all ${isMe ? 'text-blue-400' : 'text-gray-400'}`} />
    </div>
    <div className="relative flex items-center z-20">
      {isMonthlyTop && <span className={`absolute -left-3 md:-left-4 -top-5 md:-top-6 text-[4px] md:text-[5px] font-black px-1 py-[1px] rounded shadow-sm transform -rotate-[20deg] z-30 border ${monthlyBadgeStyle}`}>{currentMonthNum}월 Top</span>}
      <span className={`text-[8px] md:text-[9px] px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-bold tracking-tighter truncate max-w-[40px] md:max-w-[50px] border transition-all
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
), (prevProps, nextProps) => {
  return (
    prevProps.u?.id === nextProps.u?.id &&
    prevProps.u?.voted === nextProps.u?.voted &&
    prevProps.u?.choices?.isUnknown === nextProps.u?.choices?.isUnknown &&
    prevProps.u?.choices?.isLike === nextProps.u?.choices?.isLike &&
    prevProps.showLight === nextProps.showLight &&
    prevProps.isChallenger === nextProps.isChallenger
  );
});

// 3. Grid Cell 컴포넌트: react-window가 렌더링 할 때 호출 (v2 API)
const Cell = memo(({ columnIndex, rowIndex, style, ...cellProps }) => {
  const { items, columnCount, stageInfo, isBlindActive, dailyTopUsers, monthlyTopUsers, currentUser } = cellProps;
  const itemIndex = rowIndex * columnCount + columnIndex;
  const u = items[itemIndex];

  // 빈자리(셀) 렌더링 무시
  if (!u) {
    return <div style={style}></div>;
  }

  const isMe = currentUser?.uid && u?.id === currentUser?.uid;
  const showLight = isBlindActive
    ? (isMe ? (u?.voted || u.voted) : (!stageInfo?.scoreHidden && (u?.voted || u.voted)))
    : (u?.voted || u.voted);

  const isChallenger = stageInfo?.challengerUid === u?.id && (stageInfo?.status === 'playing' || stageInfo?.status === 'voting');

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

  let monthlyBadgeStyle = "bg-indigo-500 border-indigo-300 text-white";
  if (isMonthlyTop1) monthlyBadgeStyle = "bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-200 text-black";
  else if (isMonthlyTop2) monthlyBadgeStyle = "bg-gradient-to-r from-gray-300 to-gray-400 border-gray-100 text-black";
  else if (isMonthlyTop3) monthlyBadgeStyle = "bg-gradient-to-r from-orange-400 to-orange-600 border-orange-200 text-white";

  return (
    <div style={style}>
      <UserItem
        key={u?.id || Math.random()}
        u={u}
        isMe={isMe}
        showLight={showLight}
        isChallenger={isChallenger}
        isDailyTop1={isDailyTop1}
        isDailyTop2={isDailyTop2}
        isDailyTop3={isDailyTop3}
        isMonthlyTop={isMonthlyTop}
        currentMonthNum={currentMonthNum}
        monthlyBadgeStyle={monthlyBadgeStyle}
      />
    </div>
  );
});

// 4. 메인 AudienceGrid 컴포넌트
const AudienceGrid = memo(({ audienceList = [], stageInfo = {}, isBlindActive, dailyTopUsers = [], monthlyTopUsers = [], currentUser = null }) => {
  const [windowWidth, windowHeight] = useWindowSize();

  // 🚨 화면 너비에 따른 Column(가로 열) 수 및 셀 크기, 객석 최대 높이 계산
  const { columnCount, columnWidth, rowHeight, maxGridHeight } = useMemo(() => {
    let cols = 5; // 기본 모바일 세로 모드
    let ratio = Math.min(windowWidth / 400, 1); // 스케일 조정 (작은 화면 방어)
    let gridHeight = windowHeight * 0.45; // 기본은 화면의 45%

    if (windowWidth > 1024) {
      cols = 15;      // 데스크톱 (넓음)
      gridHeight = windowHeight - 550; // 상단 전광판, 하단 컨트롤러 높이 및 여백 차감
    } else if (windowWidth > 768) {
      cols = 10;  // 태블릿
      gridHeight = windowHeight - 500;
    } else if (windowWidth > 480) {
      cols = 8;   // 모바일 가로 모드
      gridHeight = windowHeight - 450;
    }

    const w = (windowWidth - 32) / cols; // 좌우 여백 제외 너비
    const h = 100 * ratio; // 아이템 높이 안정화

    // 레이아웃이 깨지지 않게 최소 높이 150px 방어
    return {
      columnCount: cols,
      columnWidth: Math.max(w, 40),
      rowHeight: Math.max(h, 90),
      maxGridHeight: Math.max(gridHeight, 150)
    };
  }, [windowWidth, windowHeight]);

  const rowCount = Math.ceil(audienceList.length / columnCount);

  // 🚨 itemData: Grid의 셀(Item)에게 공유해 줄 문맥(상태/데이터)
  const itemData = useMemo(() => ({
    items: audienceList,
    columnCount,
    stageInfo,
    isBlindActive,
    dailyTopUsers,
    monthlyTopUsers,
    currentUser
  }), [audienceList, columnCount, stageInfo, isBlindActive, dailyTopUsers, monthlyTopUsers, currentUser]);

  // 창 크기를 못 가져온 극초기 로딩 시 방어 로직
  if (windowWidth === 0) return <div className="min-h-[200px] flex justify-center items-center text-gray-400">객석 배치 중...</div>;

  return (
    <div className="w-full flex justify-center bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-inner p-2">
      {/* react-window 가상 그리드 컴포넌트 호출 (v2 문법 호환성 적용) */}
      <Grid
        className="scrollbar-hide" // 커스텀 스크롤 숨김 클래스
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={Math.min(maxGridHeight, rowCount * rowHeight)} // 🚨 계산된 뷰포트별 최대 높이 적용
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={windowWidth - 32}
        cellProps={itemData} // v2의 props 전달 방식
        cellComponent={Cell}
        style={{ overflowX: 'hidden' }} // 🚨 이상한 가로 스크롤바 강제 제거
      />
    </div>
  );
});

export default AudienceGrid;