import React, { useState } from 'react';
import { HelpCircle, ThumbsUp, Send, X } from 'lucide-react';
import { db, auth } from '../../firebase'; // 경로 확인 필요
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const VoteModal = ({ onClose, stageInfo }) => {
  const [voteStatus, setVoteStatus] = useState({ isUnknown: false, isLike: false });

  // 🚨 [추가] 햅틱 피드백 함수 (모바일 기기 등 지원 시 작동)
  const triggerHaptic = (pattern = 50) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const submitVote = async () => {
    if (!auth.currentUser) return alert("로그인이 필요합니다.");

    const { isUnknown, isLike } = voteStatus;

    // 점수 계산 로직
    let points = 0;
    if (isUnknown && isLike) points = 4;
    else if (isUnknown && !isLike) points = 1; // "누구요"만 선택
    else if (!isUnknown && isLike) points = 1; // "좋아요"만 선택
    // (참고: 둘 다 선택 안 하면 points는 0)

    // 🚨 [추가] 기기(브라우저) 단위 다중 계정 얌체 투표 방지
    const localVoted = JSON.parse(localStorage.getItem('votedStages') || '{}');
    if (localVoted[stageInfo.stageId]) {
      alert("🚨 이 기기에서는 이미 해당 무대에 투표한 기록이 있습니다.\n(다중 계정을 이용한 중복 투표는 금지됩니다.)");
      onClose();
      return;
    }

    try {
      // ✅ [수정 1] 중복 투표 방지 로직 강화
      // "내가(uid)", "이 무대(stageId)에" 투표한 적이 있는지 확인해야 함.
      // 제목(songTitle)만 검사하면, 다음에 똑같은 노래 또 부를 때 투표를 못 하게 됨.
      const q = query(
        collection(db, "votes"),
        where("uid", "==", auth.currentUser.uid),
        where("stageId", "==", stageInfo.stageId) // 👈 [핵심] 무대 고유 번호로 확인
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert("이미 이번 무대에 투표하셨습니다.");
        onClose();
        return;
      }

      // ✅ [수정 2] 투표 데이터 저장 시 stageId 포함 (신청자 정보 추가)
      await addDoc(collection(db, "votes"), {
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName,
        songTitle: stageInfo.songTitle,

        artist: stageInfo.artist || '', // 가수 정보 저장
        song: stageInfo.song || '',     // 곡 정보 저장

        stageId: stageInfo.stageId,
        challengerName: stageInfo.challengerName || '익명 신청자', // 👈 [추가] 신청자 닉네임
        challengerUid: stageInfo.challengerUid || '',           // 👈 [추가] 신청자 고유값(ID)

        points: points,

        choices: { isUnknown, isLike }, // 선택 정보 저장
        timestamp: new Date()
      });

      // 🚨 기기 로컬에 투표 완료 기록 남기기
      localVoted[stageInfo.stageId] = true;
      localStorage.setItem('votedStages', JSON.stringify(localVoted));

      // 🚨 [UX 개선] 투표 제출 성공 시 경쾌한 2단 진동 피드백
      triggerHaptic([30, 50, 30]);

      alert(`${points}점 투표 완료!`);
      onClose();

    } catch (error) {
      console.error("투표 에러:", error);
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 relative shadow-2xl border-4 border-indigo-500">

        {/* 닫기 버튼 */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <p className="text-xs font-bold text-indigo-500 mb-1 tracking-widest">NOW VOTING</p>
          <h2 className="text-2xl font-black text-gray-900">{stageInfo.songTitle}</h2>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => {
              triggerHaptic(20); // 가벼운 진동
              setVoteStatus({ ...voteStatus, isUnknown: !voteStatus.isUnknown });
            }}
            className={`flex-1 h-32 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 border-2 active:scale-95
              ${voteStatus.isUnknown ? 'bg-gray-800 text-white border-gray-800 scale-105 shadow-[0_0_15px_rgba(0,0,0,0.3)]' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
          >
            <HelpCircle size={32} />
            <span className="font-bold">처음 들어봤어요</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(20); // 가벼운 진동
              setVoteStatus({ ...voteStatus, isLike: !voteStatus.isLike });
            }}
            className={`flex-1 h-32 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 border-2 active:scale-95
              ${voteStatus.isLike ? 'bg-pink-500 text-white border-pink-500 scale-105 shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'bg-pink-50 text-pink-400 border-pink-100 hover:bg-pink-100'}`}
          >
            <ThumbsUp size={32} />
            <span className="font-bold">좋아요!</span>
          </button>
        </div>

        <p className="text-sm font-bold text-gray-400 mb-3 text-center tracking-tight">
          해당하는 버튼을 누르고, 없다면 그냥 제출!
        </p>

        <button onClick={submitVote} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-lg shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] transition-all duration-200 active:scale-95 active:shadow-none translate-y-0 active:translate-y-1 flex items-center justify-center gap-2">
          <Send size={20} /> 투표 제출하기
        </button>
      </div>
    </div>
  );
};

export default VoteModal;