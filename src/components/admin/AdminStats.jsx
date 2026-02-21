import React from 'react';
import { BarChart, Trash2 } from 'lucide-react';

const AdminStats = ({
  allChallenges,
  statsSearchArtist,
  setStatsSearchArtist,
  statsSearchSong,
  setStatsSearchSong,
  statsSearchChallenger,
  setStatsSearchChallenger,
  statsDateSearch,
  setStatsDateSearch,
  statsStatusFilter,
  setStatsStatusFilter,
  statsSort,
  handleStatsSort,
  handleUpdateChallengeStatus,
  handleDeleteChallenge,
}) => {
  return (
    <div className="w-full max-w-7xl bg-gray-800 rounded-xl border border-pink-500/30 p-6 shadow-2xl overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-pink-400 flex items-center gap-2">
          <BarChart className="w-5 h-5 md:w-6 md:h-6" /> 도전 신청곡 통계 관리
        </h2>
        {/* 필터 영역 */}
      </div>
      <div className="w-full overflow-x-auto border border-gray-700 rounded-lg bg-gray-900 max-h-[700px]">
        {/* 테이블 영역 */}
      </div>
    </div>
  );
};

export default AdminStats;
