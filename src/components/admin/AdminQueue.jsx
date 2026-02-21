import React from 'react';
import { Edit3, Trash2, Copy, Mic2 } from 'lucide-react';

const AdminQueue = ({
  challenges,
  getPlayCount,
  selectChallenge,
  completeChallenge,
  handleEditQueue,
  handleDeleteChallenge
}) => {
  return (
    <div className="w-full max-w-7xl bg-gray-800 rounded-xl border border-indigo-500/30 p-6 shadow-2xl overflow-hidden mt-6">
      <h2 className="text-xl font-bold text-indigo-400 flex items-center gap-2 mb-4">
        <Mic2 className="w-5 h-5 md:w-6 md:h-6" /> 실시간 도전 신청곡 목록 (대기열)
      </h2>
      <div className="w-full overflow-x-auto border border-gray-700 rounded-lg bg-gray-900 max-h-[700px]">
        <table className="w-full text-left text-sm text-gray-300 min-w-[1000px]">
          <thead className="bg-black text-gray-400 uppercase text-xs sticky top-0 z-10 shadow-md">
            <tr>
              <th className="p-3 border-b border-gray-700">날짜&시간</th>
              <th className="p-3 border-b border-gray-700 text-blue-300">가수</th>
              <th className="p-3 border-b border-gray-700 text-white">제목</th>
              <th className="p-3 border-b border-gray-700 text-center text-indigo-300">신청자(도전자)</th>
              <th className="p-3 border-b border-gray-700 text-center">재생 여부</th>
              <th className="p-3 border-b border-gray-700 text-center">같은 곡 이력</th>
              <th className="p-3 border-b border-gray-700 text-center">수정</th>
              <th className="p-3 border-b border-gray-700 text-center">삭제</th>
              <th className="p-3 border-b border-gray-700">고유값</th>
            </tr>
          </thead>
          <tbody>
            {challenges.length === 0 ? (
              <tr><td colSpan="9" className="text-center py-12 text-gray-500">대기 중인 신청곡이 없습니다.</td></tr>
            ) : challenges.map(c => (
              <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => selectChallenge(c)}>
                <td className="p-3 text-xs font-mono">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : '방금'}</td>
                <td className="p-3 font-bold text-blue-200">{c.artist}</td>
                <td className="p-3 font-bold text-white">{c.song}</td>
                <td className="p-3 text-center font-bold text-indigo-300">{c.applicantName}</td>
                <td className="p-3 text-center">
                  <button onClick={(e) => { e.stopPropagation(); completeChallenge(c.id); }} className="text-xs bg-gray-700 hover:bg-green-600 text-white px-2 py-1 rounded">완료 처리</button>
                </td>
                <td className="p-3 text-center text-gray-400">{getPlayCount(c.artist, c.song)}회</td>
                <td className="p-3 text-center">
                  <button onClick={(e) => { e.stopPropagation(); handleEditQueue(c); }} className="text-blue-400 hover:text-white p-1"><Edit3 className="w-4 h-4 md:w-5 md:h-5" /></button>
                </td>
                <td className="p-3 text-center">
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteChallenge(c.id); }} className="text-red-400 hover:text-white p-1"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                </td>
                <td className="p-3 text-[10px] text-gray-500 font-mono flex items-center gap-1">
                  <span className="truncate max-w-[80px]">{c.id}</span>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.id); alert('복사되었습니다.'); }} className="text-gray-400 hover:text-white bg-gray-700 p-1 rounded"><Copy className="w-3 h-3 md:w-4 md:h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminQueue;
