import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Edit3, Trash2, Clock, CheckCircle } from 'lucide-react';

const MyPage = () => {
  const [myChallenges, setMyChallenges] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "challenges"), where("uid", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setMyChallenges(list);
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = async (item) => {
    const newArtist = prompt("가수명을 수정하세요:", item.artist);
    if (!newArtist) return;
    const newSong = prompt("곡 제목을 수정하세요:", item.song);
    if (!newSong) return;
    const newMessage = prompt("사연을 수정하세요:", item.message);

    await updateDoc(doc(db, "challenges", item.id), {
      artist: newArtist,
      song: newSong,
      message: newMessage || ''
    });
    alert("수정 완료되었습니다.");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 이 도전 신청을 삭제하시겠습니까? (삭제된 티켓은 반환되지 않을 수 있습니다)")) return;
    await deleteDoc(doc(db, "challenges", id));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen pt-24 pb-24 font-sans">
      <h2 className="text-3xl font-black mb-8 text-gray-900 border-b-4 border-indigo-500 inline-block pb-2">마이 페이지</h2>

      <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          🎙️ 나의 도전 신청 내역
        </h3>

        {myChallenges.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg">아직 신청한 도전곡이 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {myChallenges.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-300 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {item.status === 'pending' ? (
                      <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1"><Clock size={12} /> 대기 중</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1"><CheckCircle size={12} /> 무대 진행 완료</span>
                    )}
                    <span className="text-xs text-gray-400 font-mono">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : '최근'}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-gray-900">{item.artist} - {item.song}</h4>
                  {item.message && <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded line-clamp-2">"{item.message}"</p>}
                </div>

                {item.status === 'pending' && (
                  <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onClick={() => handleEdit(item)} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-colors">
                      <Edit3 size={16} /> 수정
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors">
                      <Trash2 size={16} /> 삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage;