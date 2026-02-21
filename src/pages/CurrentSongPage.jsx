import React from 'react';
import { HelpCircle, ThumbsUp, Send } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const CurrentSongPage = ({ voteStatus, setVoteStatus, navigateTo, stageInfo }) => {

  // ✅ [안전장치] 만약 stageInfo 데이터가 아직 안 넘어왔다면 로딩 화면을 보여줌 (흰 화면 방지)
  if (!stageInfo) {
    return <div className="h-screen flex items-center justify-center text-white bg-gray-900">무대 정보를 불러오는 중...</div>;
  }

  const submitVote = async () => {
    // 1. 투표 가능한 상태인지 확인 (관리자는 언제든 투표 가능하게 하려면 이 부분 주석 처리 가능)
    // if (stageInfo.status !== 'voting') { ... } 

    // 하지만 관리자도 '투표 모드'일 때만 투표하는 게 안전하므로 유지하거나,
    // 관리자 편의를 위해 "status 상관없이 투표"를 원하시면 아래 if문을 지우세요.
    if (stageInfo.status !== 'voting' && stageInfo.status !== 'playing') {
      alert("지금은 투표 시간이 아닙니다!");
      return;
    }

    if (!auth.currentUser) {
      alert("로그인이 필요합니다."); return;
    }

    const { isUnknown, isLike } = voteStatus;
    let points = 0;
    if (isUnknown && isLike) points = 4;
    else if (isUnknown && !isLike) points = 1;
    else if (!isUnknown && isLike) points = 1;

    if (points === 0) {
      alert("항목을 선택해주세요!"); return;
    }

    try {
      // 중복 투표 방지
      const q = query(
        collection(db, "votes"),
        where("uid", "==", auth.currentUser.uid),
        where("songTitle", "==", stageInfo.songTitle)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert("이미 이 곡에 투표하셨습니다.");
        navigateTo('audience');
        return;
      }

      await addDoc(collection(db, "votes"), {
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName,
        songTitle: stageInfo.songTitle,
        points: points,
        choices: { isUnknown, isLike },
        timestamp: new Date()
      });

      alert(`${points}점 투표 완료! (관리자 투표)`);
      setVoteStatus({ isUnknown: false, isLike: false });
      navigateTo('audience');

    } catch (error) {
      console.error("투표 에러:", error);
      alert("투표 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      <div className="w-full max-w-3xl bg-black text-green-400 p-6 rounded-xl shadow-2xl mb-8 text-center border-4 border-gray-700">
        <p className="text-xs text-gray-500 mb-1">NOW PLAYING</p>

        {/* 안전하게 제목 표시 */}
        <h1 className="text-3xl md:text-5xl font-black tracking-wider animate-pulse">
          {stageInfo.songTitle || "대기 중..."}
        </h1>

      </div>

      <div className="w-full max-w-4xl flex gap-2 items-stretch h-40">
        <button
          onClick={() => setVoteStatus({ ...voteStatus, isUnknown: !voteStatus.isUnknown })}
          className={`flex-1 rounded-xl flex flex-col items-center justify-center gap-2 transition-all shadow-md border-b-4 
            ${voteStatus.isUnknown ? 'bg-gray-600 text-white border-gray-800 translate-y-1' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
        >
          <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-white" /><span className="text-lg font-bold">처음 듣는 곡</span>
        </button>

        <button
          onClick={() => setVoteStatus({ ...voteStatus, isLike: !voteStatus.isLike })}
          className={`flex-1 rounded-xl flex flex-col items-center justify-center gap-2 transition-all shadow-md border-b-4 
            ${voteStatus.isLike ? 'bg-red-500 text-white border-red-700 translate-y-1' : 'bg-white text-red-500 border-gray-300 hover:bg-red-50'}`}
        >
          <ThumbsUp className="w-6 h-6 md:w-8 md:h-8 text-white" /><span className="text-lg font-bold">노래 좋아요!</span>
        </button>

        <button onClick={submitVote} className="w-24 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg border-b-4 border-indigo-800 active:translate-y-1 transition-all">
          <Send className="w-5 h-5 md:w-6 md:h-6" /><span className="text-sm font-bold">제출</span>
        </button>
      </div>
    </div>
  );
};

export default CurrentSongPage;