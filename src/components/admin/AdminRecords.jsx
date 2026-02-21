import React from 'react';
import { BarChart, Edit3, Trash2 } from 'lucide-react';

const AdminRecords = ({
  groupedData,
  recordSort,
  handleRecordSort,
  recordArtistSearch,
  setRecordArtistSearch,
  recordSongSearch,
  setRecordSongSearch,
  recordDateSearch,
  setRecordDateSearch,
  getPlayCount,
  handleEditRecordTitle,
  handleDeleteRecord
}) => {
  return (
    <div className="w-full max-w-7xl bg-gray-800 rounded-xl border border-blue-500/30 p-6 shadow-2xl overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
          <BarChart className="w-5 h-5 md:w-6 md:h-6" /> 무대 기록 관리 (집계 완료 데이터)
        </h2>
        {/* 필터 영역 */}
      </div>
      <div className="w-full overflow-x-auto border border-gray-700 rounded-lg bg-gray-900 max-h-175">
        {/* 테이블 영역 */}
      </div>
    </div>
  );
};

export default AdminRecords;
