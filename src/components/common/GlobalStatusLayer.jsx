import React, { useState, useEffect } from 'react';
import './GlobalStatusLayer.css';

const GlobalStatusLayer = ({ socket, currentPage }) => {
  const [toast, setToast] = useState('');
  const [maintenance, setMaintenance] = useState(false);

  // 🚨 [추가] 내비게이션과 동일한 방식으로 어두운/밝은 페이지 판별
  const isDarkPage = ['audience', 'broadcast', 'currentSong', 'admin'].includes(currentPage);
  
  // 🚨 [추가] 테마별 동적 CSS 클래스
  const toastThemeClass = isDarkPage 
    ? "bg-gray-900/95 text-white border-indigo-500 shadow-[0_10px_40px_rgba(0,0,0,0.5)]" 
    : "bg-white/95 text-gray-800 border-indigo-300 shadow-[0_10px_40px_rgba(99,102,241,0.2)]";

  useEffect(() => {
    // 🚨 [핵심] 브라우저의 기본 alert 가로채기!
    // 이제 앱 어디서든 alert()을 호출하면 이 코드가 대신 실행됩니다.
    const originalAlert = window.alert;
    window.alert = (msg) => {
      setToast(msg);
      // 3초 뒤에 예쁜 알림이 스르륵 사라지게 설정 (시간 조절 가능)
      setTimeout(() => setToast(''), 1000);
    };

    if (socket) {
      socket.on('show_toast', (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 4000);
      });
      socket.on('set_maintenance', (status) => setMaintenance(status));
    }

    return () => {
      window.alert = originalAlert; // 앱 종료 시 원래대로 복구
      if (socket) { socket.off('show_toast'); socket.off('set_maintenance'); }
    };
  }, [socket]);

  return (
    <>
      {maintenance && (
        <div className="maintenance-layer">
          <h2>🚧 잠시 방송 준비 중입니다 🚧</h2>
        </div>
      )}
      
      {/* 🚨 [수정] 상단에서 부드럽게 등장하는 예쁜 토스트 UI로 교체 */}
      <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[10000] transition-all duration-500 ease-out pointer-events-none
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        <div className={`${toastThemeClass} backdrop-blur-md px-6 py-4 rounded-full border flex items-center gap-3`}>
          <span className="text-xl animate-bounce">🔔</span>
          <span className="font-bold text-sm md:text-base tracking-tight whitespace-pre-wrap text-center">{toast}</span>
        </div>
      </div>
    </>
  );
};

export default GlobalStatusLayer;