import React, { useState, useEffect } from 'react';
import './GlobalStatusLayer.css';

const GlobalStatusLayer = ({ socket }) => {
  const [toast, setToast] = useState('');
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    if (!socket) return;
    socket.on('show_toast', (msg) => {
      setToast(msg);
      setTimeout(() => setToast(''), 4000);
    });
    socket.on('set_maintenance', (status) => setMaintenance(status));
    return () => { socket.off('show_toast'); socket.off('set_maintenance'); };
  }, [socket]);

  return (
    <>
      {maintenance && (
        <div className="maintenance-layer">
          <h2>🚧 잠시 방송 준비 중입니다 🚧</h2>
        </div>
      )}
      {toast && <div className="toast-box">📢 {toast}</div>}
    </>
  );
};

export default GlobalStatusLayer;