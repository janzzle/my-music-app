import React, { useState, useEffect } from 'react';
import './CountdownOverlay.css';

const CountdownOverlay = ({ socket }) => {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!socket) return;
    socket.on('start_countdown', () => setCount(5));
    return () => socket.off('start_countdown');
  }, [socket]);

  useEffect(() => {
    if (count === null) return;
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCount(null); // 0이 되면 사라짐
    }
  }, [count]);

  if (count === null) return null;

  return (
    <div className="countdown-overlay">
      <h1 className="countdown-text">{count}</h1>
    </div>
  );
};

export default CountdownOverlay;