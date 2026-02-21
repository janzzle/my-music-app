import React from 'react';
import { RefreshCw } from 'lucide-react';

const AdminUsers = ({
  allUsers,
  handleRefreshAudience,
  userFilterOnline,
  setUserFilterOnline,
  userSearchTerm,
  setUserSearchTerm,
  userSort,
  handleUserSort,
  grantTicket,
  refreshUserList
}) => {
  return (
    <div className="w-full max-w-7xl bg-gray-800 rounded-xl border border-green-500/30 p-6 shadow-2xl overflow-hidden mt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">👥 참가자 목록 및 티켓 관리</h2>

        <div className="flex flex-col md:flex-row gap-2">
          {/* 🚨 객석 새로고침(Ping-Pong) 버튼 */}
          <button
            onClick={handleRefreshAudience}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-bold rounded-lg shadow-lg transition-colors border border-indigo-400 mr-2"
          >
            <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" /> 객석 새로고침
          </button>

          {/* 🚨 접속 중인 사람만 보기 토글 버튼 */}
          <div className="flex gap-1 bg-gray-900 p-1 rounded-lg border border-gray-700">
            <button onClick={() => setUserFilterOnline(true)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${userFilterOnline ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}>🟢 접속 중만 보기</button>
            <button onClick={() => setUserFilterOnline(false)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${!userFilterOnline ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}>전체보기</button>
          </div>
          <input type="text" value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} placeholder="🔍 이름/이메일 검색" className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none text-white w-48 focus:border-green-400" />
          <button onClick={refreshUserList} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors">🔄 목록 갱신</button>
        </div>
      </div>
      <div className="w-full overflow-x-auto border border-gray-700 rounded-lg bg-gray-900 max-h-[700px]">
        <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
          <thead className="bg-black text-gray-400 uppercase text-xs sticky top-0 z-10 shadow-md">
            <tr>
              <th className="p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800" onClick={() => handleUserSort('name')}>이름(닉네임) {userSort.key === 'name' && (userSort.order === 'desc' ? '▼' : '▲')}</th>
              <th className="p-3 border-b border-gray-700">이메일</th>
              {/* 🚨 접속 상태 클릭 시 정렬 가능하도록 변경 */}
              <th className="p-3 border-b border-gray-700 text-center cursor-pointer hover:bg-gray-800" onClick={() => handleUserSort('isOnline')}>접속 상태 {userSort.key === 'isOnline' && (userSort.order === 'desc' ? '▼' : '▲')}</th>
              <th className="p-3 border-b border-gray-700 text-center">권한</th>
              <th className="p-3 border-b border-gray-700 text-center">보유 추가 티켓</th>
              <th className="p-3 border-b border-gray-700 text-center">티켓 지급</th>
              <th className="p-3 border-b border-gray-700">고유 UID</th>
            </tr>
          </thead>
          <tbody>
            {allUsers
              .filter(u => (u.name || '').includes(userSearchTerm) || (u.email || '').includes(userSearchTerm))
              .filter(u => userFilterOnline ? u.isOnline === true : true)
              .sort((a, b) => {
                let valA = a[userSort.key]; let valB = b[userSort.key];
                // 접속 상태 정렬의 경우 true(1), false(0)로 환산하여 정렬
                if (userSort.key === 'isOnline') { valA = a.isOnline ? 1 : 0; valB = b.isOnline ? 1 : 0; }
                else { valA = valA || ''; valB = valB || ''; }

                if (valA < valB) return userSort.order === 'asc' ? -1 : 1;
                if (valA > valB) return userSort.order === 'asc' ? 1 : -1;
                return 0;
              })
              .map(u => {
                return (
                  <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="p-3 font-bold text-white">{u.name || '미설정'}</td>
                    <td className="p-3 text-gray-400">{u.email || '없음'}</td>
                    <td className="p-3 text-center">{u.isOnline ? <span className="text-green-400 font-bold text-xs">🟢 접속 중</span> : <span className="text-gray-500 text-xs">⚪ 오프라인</span>}</td>
                    <td className="p-3 text-center">{u.isAdmin ? <span className="text-red-400 font-bold">관리자</span> : '일반'}</td>
                    <td className="p-3 text-center font-bold text-yellow-400">{u.extraTickets || 0}장</td>
                    <td className="p-3 text-center">
                      <button onClick={() => grantTicket(u.id, u.extraTickets)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold shadow-lg">+1 지급</button>
                    </td>
                    <td className="p-3 text-[10px] text-gray-500 font-mono">{u.id}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
