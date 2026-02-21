import React from 'react';
import { Menu, X, Zap, Settings, Monitor } from 'lucide-react'; // Monitor 아이콘 추가

const Navigation = ({ isMenuOpen, setIsMenuOpen, user, handleLogout, setIsSignupMode, navigateTo, isAdmin, currentPage }) => {

  // 어두운 배경(무대/송출 화면)인지, 밝은 배경(기타 페이지)인지 판별
  const isDarkPage = ['audience', 'broadcast', 'currentSong', 'admin'].includes(currentPage);

  // 페이지 성격에 따라 텍스트 및 아이콘 색상을 동적으로 변경
  const textColor = isDarkPage ? 'text-gray-200' : 'text-gray-800';
  const iconColor = isDarkPage ? 'text-gray-300' : 'text-gray-800';
  const hoverColor = isDarkPage ? 'hover:text-white' : 'hover:text-black';
  const borderColor = isDarkPage ? 'border-gray-500' : 'border-gray-300';

  const handleLogoClick = () => {
    if (user) {
      navigateTo('audience');
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {/* 🚨 크기 축소 (py-1.5, px-3), 배경 투명화 (bg-black/40), 선 색상 어둡게 변경 */}
      {/* 내비가 스크롤과 함께 자연스럽게 올라가도록 absolute 적용, 크기 딱 맞게, 투명하게 수정 */}
      <div className="absolute top-4 right-4 md:right-6 z-[100] flex items-center gap-2 bg-transparent p-0">
        <div
          onClick={handleLogoClick}
          className={`flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity pr-2 border-r ${borderColor}`}
        >
          <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400 fill-current drop-shadow-md" />
          <div className={`font-black italic text-xs md:text-sm tracking-tighter ${textColor} drop-shadow-md`}>
            숨은 <span className="text-indigo-500">명곡대전</span>
          </div>
        </div>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`${iconColor} ${hoverColor} transition-colors flex items-center justify-center drop-shadow-md`}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isMenuOpen && (
        <>
          {/* 👇 외부 영역 클릭 시 메뉴 닫기용 투명 오버레이 */}
          <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>

          <div className="absolute top-12 right-4 md:right-6 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 w-56 overflow-hidden animate-fade-in-down origin-top-right">
            <div className="bg-gray-50 p-3 border-b text-xs font-bold text-gray-600">
              {user ? `👋 환영합니다! ${user.name}님` : '로그인이 필요합니다'}
            </div>

            <nav className="flex flex-col">
              {user ? (
                <div className="flex border-b border-gray-100">
                  <button
                    onClick={() => navigateTo('mypage')}
                    className="flex-1 py-3 text-center hover:bg-indigo-50 text-indigo-600 font-bold text-sm border-r border-gray-100 transition-colors"
                  >
                    👤 내 정보
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-3 text-center hover:bg-red-50 text-red-500 font-bold text-sm transition-colors"
                  >
                    🚪 로그아웃
                  </button>
                </div>
              ) : (
                <button onClick={() => { setIsSignupMode(true); setIsMenuOpen(false); }} className="text-left px-4 py-3 hover:bg-indigo-50 text-indigo-600 font-bold border-b border-gray-100 text-sm">👤 회원가입 / 로그인</button>
              )}

              <button onClick={() => navigateTo('guide')} className="text-left px-4 py-3 hover:bg-gray-50 text-gray-700 border-b border-gray-100 text-sm">📖 이용 가이드</button>
              <button onClick={() => navigateTo('audience')} className="text-left px-4 py-3 hover:bg-gray-50 text-gray-700 border-b border-gray-100 text-sm">🎭 객석 이동</button>
              <button onClick={() => navigateTo('history')} className="text-left px-4 py-3 hover:bg-gray-50 text-gray-700 border-b border-gray-100 text-sm">📅 오늘의 노래</button>
              <button onClick={() => navigateTo('challenge')} className="text-left px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm border-b border-gray-100">✨ 도전 신청</button>

              {/* ✅ [수정] 관리자 전용 메뉴 영역 */}
              {isAdmin && (
                <div className="bg-red-50 border-t border-red-100">
                  <div className="px-4 py-1 text-[10px] font-bold text-red-400 uppercase tracking-wider mt-1">Admin Only</div>

                  {/* 1. 컨트롤러 */}
                  <button
                    onClick={() => navigateTo('admin')}
                    className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600 font-bold text-sm flex items-center gap-2"
                  >
                    <Settings size={14} /> 컨트롤러 (Admin)
                  </button>

                  {/* 2. 송출용 화면 (OBS용) */}
                  <button
                    onClick={() => navigateTo('broadcast')}
                    className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600 font-bold text-sm flex items-center gap-2 mb-1"
                  >
                    <Monitor size={14} /> 📡 송출용 화면 (OBS)
                  </button>
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
};

export default Navigation;