import React, { useState } from 'react';
import { User } from 'lucide-react';
import VoteModal from '../components/audience/VoteModal';
// 👇 [추가] 카운트다운 컴포넌트 가져오기
import CountdownOverlay from '../components/common/CountdownOverlay';
import AudienceGrid from '../components/common/AudienceGrid';
import RankingBoard from '../components/common/RankingBoard';
import StageStatusPanel from '../components/common/StageStatusPanel';
import SkeletonUI from '../components/common/SkeletonUI'; // 🚨 스켈레톤 컴포넌트 추가

// 👇 [추가] Firebase 연동을 위한 함수 가져오기
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

const AudiencePage = ({ audienceList = [], user, stageInfo = {}, socket, isAdmin, leaderboard = [], dailyTopUsers = [], monthlyTopUsers = [] }) => {
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // 🚨 [추가] 로딩 상태 관리
  const [isLoading, setIsLoading] = useState(true);

  // 데이터가 성공적으로 들어왔다면 로딩 상태 해제
  React.useEffect(() => {
    if (audienceList && audienceList.length > 0) {
      // 깜빡임 방지를 위해 약간의 시간 차 설정 (0.3초)
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [audienceList, stageInfo]);

  const [adminArtist, setAdminArtist] = useState('');
  const [adminSong, setAdminSong] = useState('');
  const [adminChallengerName, setAdminChallengerName] = useState('');
  const [adminChallengeId, setAdminChallengeId] = useState('');
  const [isApplied, setIsApplied] = useState(false); // 🚨 적용 상태 추가

  React.useEffect(() => {
    if (stageInfo?.artist) setAdminArtist(stageInfo.artist);
    if (stageInfo?.song) setAdminSong(stageInfo.song);

    if (stageInfo?.challengerName) setAdminChallengerName(stageInfo.challengerName);
    if (stageInfo?.challengerUid) setAdminChallengeId(stageInfo.challengerUid);

  }, [stageInfo]);

  // 👇 [추가] 1. 점수 모드 상태 ('realtime' 또는 'blind')
  const [adminScoreMode, setAdminScoreMode] = useState(stageInfo?.scoreMode || 'realtime');

  const handleApplyChallengeId = async () => {
    if (!adminChallengeId) return alert("고유값을 입력해주세요.");
    try {
      // 🚨 공백을 제거(.trim)하여 정확한 고유값을 인식하도록 수정
      const snap = await getDoc(doc(db, "challenges", adminChallengeId.trim()));
      if (snap.exists()) {
        const data = snap.data();
        setAdminArtist(data.artist);
        setAdminSong(data.song);
        setAdminChallengerName(data.applicantName || '익명 신청자');
        setIsApplied(true); // 🚨 적용 상태 활성화 (관리자 페이지처럼 락 걸림)
      } else { alert("해당 고유값을 찾을 수 없습니다."); }
    } catch (e) { console.error(e); }
  };

  const updateStage = async (newStatus, artist = adminArtist, song = adminSong) => {
    const fullTitle = artist && song ? `${artist} - ${song}` : '';
    const newStageId = newStatus === 'countdown' ? (adminChallengeId || Date.now().toString()) : stageInfo?.stageId;

    const updateData = { status: newStatus, songTitle: fullTitle, artist: artist, song: song, challengerName: adminChallengerName || '익명 신청자', challengerUid: adminChallengeId, updatedAt: new Date() };

    if (newStatus === 'countdown') {
      updateData.count = 5; updateData.stageId = newStageId; updateData.titleHidden = true; updateData.scoreMode = adminScoreMode; updateData.scoreHidden = true;
      if (adminChallengeId) await updateDoc(doc(db, "challenges", adminChallengeId), { status: 'playing' }).catch(() => { });
    } else if (newStatus === 'ready') {
      updateData.stageId = ''; updateData.count = null; updateData.titleHidden = false; updateData.scoreHidden = true;
      // 🚨 DB 내부의 기록까지 완벽하게 공백으로 덮어씌움
      updateData.songTitle = ''; updateData.artist = ''; updateData.song = ''; updateData.challengerName = ''; updateData.challengerUid = '';
      setAdminChallengeId(''); setAdminChallengerName(''); setAdminArtist(''); setAdminSong('');
    } else if (newStatus === 'ended') {
      if (stageInfo?.stageId) {
        try {
          const q = query(collection(db, "votes"), where("stageId", "==", stageInfo.stageId));
          const snapshot = await getDocs(q);
          let totalPoints = 0; let voteCount = 0;
          snapshot.forEach(voteDoc => {
            voteCount++; const data = voteDoc.data(); let pts = 0;
            if (data.choices?.isUnknown && data.choices?.isLike) pts = 4;
            else if (data.choices?.isUnknown || data.choices?.isLike) pts = 1;
            totalPoints += pts;
          });
          await setDoc(doc(db, "stage_results", stageInfo.stageId), {
            stageId: stageInfo.stageId, songTitle: stageInfo.songTitle, artist: stageInfo.artist, song: stageInfo.song, challengerName: stageInfo.challengerName || '익명 신청자', challengerUid: stageInfo.challengerUid || '', points: totalPoints, voteCount: voteCount, timestamp: new Date()
          });
        } catch (error) { console.error(error); }
      }
    }
    await setDoc(doc(db, 'stage', 'info'), updateData, { merge: true });
  };

  const startPerformance = async () => {
    if (!adminArtist || !adminSong) return alert("가수명과 곡 제목을 입력해주세요.");
    try {
      // 🚨 Firebase 복합 쿼리 에러 방지를 위해 하나만 검색 후 JS에서 필터링
      const q = query(collection(db, "stage_results"), where("song", "==", adminSong));
      const snap = await getDocs(q);
      const exists = snap.docs.some(d => d.data().artist === adminArtist);
      if (exists) {
        if (!window.confirm("🚨 이미 기록에 존재하는 곡입니다. 그래도 카운트다운을 진행하시겠습니까?")) return;
      }

      await updateStage('countdown');
      let currentCount = 5;
      const timer = setInterval(async () => {
        currentCount -= 1;
        if (currentCount <= 0) {
          clearInterval(timer);
          await setDoc(doc(db, 'stage', 'info'), { status: 'ready_to_play', count: null, titleHidden: true }, { merge: true });
          setTimeout(async () => {
            await setDoc(doc(db, 'stage', 'info'), { status: 'playing', titleHidden: true }, { merge: true });
          }, 1500);
        } else {
          await setDoc(doc(db, 'stage', 'info'), { count: currentCount }, { merge: true });
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("카운트다운 시작 중 오류가 발생했습니다.");
    }
  };

  // 👇 유저님이 정하신 [모름(1), 좋아요(1), 둘다(4)] 공식 적용 (에러 방어 추가)
  const currentScore = (audienceList || []).reduce((acc, u) => {
    if (!u?.voted) return acc; // 투표 안 했으면 0점

    // 🚨 DB에 choices 데이터가 없는 과거 기록이 섞여있을 때를 대비한 안전장치
    const { isUnknown = false, isLike = false } = u.choices || {};
    let score = 0;

    if (isUnknown && isLike) score = 4;      // 둘 다 선택 시 4점
    else if (isUnknown || isLike) score = 1; // 하나만 선택 시 1점

    return acc + score;
  }, 0);

  // 👇 4-2. [추가] 점수 공개 함수 (블라인드 모드일 때 사용)
  const revealScore = async () => {
    // 긴장감을 위해 1.5초 텀을 주고 점수 공개!
    setTimeout(async () => {
      await setDoc(doc(db, 'stage', 'info'), { scoreHidden: false }, { merge: true });
    }, 1500);
  };

  // 👇 4. [수정] 제목 공개 함수 (원하는 텀 조절 가능)
  const revealTitle = async () => {
    // 1000은 1초를 의미합니다. (예: 1.5초를 원하시면 1500, 2초면 2000으로 수정하세요!)
    setTimeout(async () => {
      await setDoc(doc(db, 'stage', 'info'), { titleHidden: false }, { merge: true });
    }, 1000);
  };


  // 👇 5. [추가] 공지 전송 & 정비 토글 함수
  const toggleMaintenance = async (val) => {
    await setDoc(doc(db, 'stage', 'info'), { maintenance: val }, { merge: true });
  };

  const isReady = stageInfo?.status === 'ready';
  const isEnded = stageInfo?.status === 'ended';
  const isVoting = stageInfo?.status === 'voting';

  // 내 투표 여부 확인 (audienceList가 비어있어도 에러 안 남)
  const myUser = (audienceList || []).find(u => u?.id === 0);
  const hasVoted = myUser ? myUser.voted : false;

  // 👇 [추가] 블라인드 모드 여부 확인 (하얀 화면 에러 방지용)
  const isBlindActive = stageInfo?.scoreMode === 'blind' && stageInfo?.scoreHidden;

  const handleUpdateRanking = async () => {
    try {
      const snapshot = await getDocs(collection(db, "stage_results"));
      const todayStr = new Date().toDateString();
      const results = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.timestamp && data.timestamp.toDate().toDateString() === todayStr) {
          results.push(data);
        }
      });
      const top3 = results.sort((a, b) => b.points - a.points).slice(0, 3);
      await setDoc(doc(db, "stage", "ranking"), { list: top3, updatedAt: new Date() });
      alert("🏆 현재 순위가 업데이트 되었습니다! (오늘 종료된 무대 기준)");
    } catch (error) {
      console.error(error);
    }
  };
  // 🚨 [추가] 객석 업데이트 (Ping-Pong) 로직 (AdminPage와 동일)
  const handleRefreshAudience = async () => {
    // 🚨 윈도우 confirm 대신, 관리자가 실수로 누르는 걸 방지하기 위해 기본 alert 활용 (의도적)
    const pingTime = Date.now();
    try {
      await updateDoc(doc(db, "stage", "info"), { pingTime });
      alert("관객 생존 응답 대기 중... (5초 후 자동 처리)");
      setTimeout(async () => {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        const batch = writeBatch(db);
        let offlineCount = 0;
        snap.forEach(d => {
          const u = d.data();
          if (u.isOnline && u.lastPong !== pingTime) {
            batch.update(d.ref, { isOnline: false });
            offlineCount++;
          }
        });
        if (offlineCount > 0) await batch.commit();
        alert(`✨ 객석 정리 완료! ${offlineCount}명의 미응답 유저가 오프라인 처리되었습니다.`);
      }, 5000);
    } catch (error) {
      console.error(error);
      alert("객석 업데이트 중 오류가 발생했습니다.");
    }
  };
  // 🚨 [추가] 데이터 로딩 전이라면 스켈레톤 UI 노출
  if (isLoading) {
    return (
      <div className="relative w-full min-h-screen md:h-screen bg-gray-900 flex flex-col items-center overflow-x-hidden pt-16 md:pt-20">
        <SkeletonUI />
      </div>
    );
  }

  // 🚨 [추가] 실시간 투표율 계산 함수
  const calculateVoteProgress = () => {
    const totalOnline = audienceList.filter(u => u.isOnline).length || 0;
    const currentVoted = audienceList.filter(u => u.isOnline && u.voted).length || 0;
    let votePercent = 0;
    if (totalOnline > 0) {
      votePercent = Math.round((currentVoted / totalOnline) * 100);
    }
    return { totalOnline, currentVoted, votePercent };
  };

  const { totalOnline, currentVoted, votePercent } = calculateVoteProgress();

  return (
    <div className="relative w-full min-h-screen md:h-screen bg-gray-900 flex flex-col items-center overflow-x-hidden overflow-y-auto md:overflow-hidden pt-16 md:pt-20 pb-24 md:pb-0 gap-6 md:gap-0">

      {/* 정비 모드 오버레이 (누락 복구 및 정중앙 고정) */}
      {stageInfo?.maintenance && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-xl z-[90] flex flex-col items-center justify-center">
          <div className="text-yellow-400 text-6xl md:text-8xl mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">🛠️</div>
          <h1 className="text-white text-3xl md:text-5xl font-black mb-4 tracking-widest text-center drop-shadow-lg">방송 준비 중입니다</h1>
          <p className="text-gray-400 text-lg md:text-xl text-center">잠시 후 다시 시작됩니다.</p>
        </div>
      )}

      {/* 투표 팝업 */}
      {showVoteModal && (
        <VoteModal stageInfo={stageInfo} onClose={() => setShowVoteModal(false)} />
      )}

      {/* 무대 전광판 (BroadcastPage와 동일한 상단 간격 유지) */}
      <div className="w-[90%] md:w-[85%] max-w-5xl min-h-[200px] md:min-h-[250px] md:h-[35%] shrink-0 bg-black flex flex-col items-center justify-center border-4 md:border-8 border-gray-800 rounded-2xl shadow-[0_0_50px_rgba(100,0,255,0.2)] relative z-0 mt-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-black/90 z-10 rounded-xl"></div>

        {/* (기존에 있던 <style> 태그는 완전히 삭제했습니다!) */}

        <div className="z-20 text-center">
          <p className="text-green-400 text-[10px] md:text-xs font-mono mb-2 tracking-widest border border-green-400 px-2 inline-block animate-pulse">LIVE STAGE</p>

          <h1 className="text-2xl md:text-5xl font-black tracking-wider min-h-[40px] md:min-h-[60px] flex items-center justify-center">

            {/* 1. 카운트다운 (방방 뛰는 animate-bounce 삭제 -> 얌전하게 제자리 고정) */}
            {stageInfo.status === 'countdown' && stageInfo.count > 0 && (
              <span className="text-6xl md:text-8xl text-red-500 inline-block">
                {stageInfo.count}
              </span>
            )}

            {/* 2. 카운트 직후 대기 텀 (안 보이는 점) */}
            {stageInfo.status === 'ready_to_play' && (
              <span className="opacity-0 inline-block">.</span>
            )}

            {/* 3. 재생 중 + 제목 숨김 (흐린 곳에서 밝아지며 등장) */}
            {stageInfo.status === 'playing' && stageInfo.titleHidden === true && (
              <span className="text-white text-3xl md:text-5xl animate-custom-fade-in inline-block drop-shadow-lg">
                🎵 신청 곡 재생 중...
              </span>
            )}

            {/* 👇 [수정] 4. 제목 공개 (재생, 투표, 종료 상태일 때 모두 제목 유지) */}
            {(stageInfo.status === 'playing' || stageInfo.status === 'voting' || stageInfo.status === 'ended') && stageInfo.titleHidden === false && (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-custom-fade-in inline-block">
                {stageInfo.songTitle || "다음 곡 대기 중"}
              </span>
            )}

            {/* 👇 [수정] 5. 그 외 상태 (대기 중일 때만) */}
            {stageInfo.status === 'ready' && (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 inline-block">
                {stageInfo.songTitle || "다음 곡 대기 중"}
              </span>
            )}

          </h1>

          {/* 👇 [수정] 전광판 하단 점수 표시 영역 */}
          {(stageInfo.status === 'playing' || stageInfo.status === 'voting' || stageInfo.status === 'ended') && (
            <div className="mt-4 md:mt-6 animate-custom-fade-in">
              {stageInfo.scoreMode === 'blind' && stageInfo.scoreHidden ? null : (
                <span key={currentScore} className="text-4xl md:text-6xl font-black text-yellow-400 tracking-widest bg-black/60 px-8 py-2 rounded-2xl border-2 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)] animate-number-pop inline-block">
                  {currentScore} <span className="text-xl md:text-3xl text-yellow-200">점</span>
                </span>
              )}
            </div>
          )}
          {/* 여기까지 점수판 끝 */}
        </div>
      </div>

      {/* 3. 객석 (공통 컴포넌트로 대체됨) */}
      <div className="w-full flex items-start justify-center pt-4 md:pt-20 relative z-10 shrink-0 md:flex-1">
        <AudienceGrid
          audienceList={audienceList}
          stageInfo={stageInfo}
          isBlindActive={isBlindActive}
          dailyTopUsers={dailyTopUsers}
          monthlyTopUsers={monthlyTopUsers}
          currentUser={user}
        />
      </div>

      {/* 하단 UI 컨테이너 (창 높이가 작아져도 서로 부딪히지 않는 반응형 배열) */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center md:items-end px-4 md:px-8 mt-auto pb-6 z-40 gap-6">

        {/* 데스크탑 중앙 정렬용 투명 여백 */}
        <div className="hidden md:block w-80 shrink-0"></div>

        {/* 중앙: 하단 투표 버튼 및 상태 (공통 컴포넌트로 대체됨) */}
        <StageStatusPanel
          stageInfo={stageInfo}
          isBroadcast={false}
          hasVoted={hasVoted}
          onVoteClick={() => setShowVoteModal(true)}
        />

        {/* 우측: 순위표 (공통 컴포넌트로 대체됨) */}
        <RankingBoard leaderboard={leaderboard} />
      </div>
      {/* 👇 [수정] 관리자 전용 리모컨 팝업 - isAdmin이 true일 때만 전체 출력 */}
      {isAdmin && (
        <div className="fixed bottom-24 left-4 md:absolute md:bottom-12 md:left-8 z-[110] flex flex-col gap-2 items-start">

          {showAdminPanel && (
            <div className="bg-gray-900 border-2 border-red-500 rounded-xl p-4 shadow-2xl flex flex-col gap-3 w-80 animate-fade-in-up z-[120]">
              <div className="text-red-400 text-sm font-bold text-center border-b border-gray-700 pb-2 flex flex-col items-center">
                <span>🛠️ 무대 조정</span>

                {/* 🚨 실시간 투표율 게이지 (투표 중이 아닐 때도 관리자는 확인 가능하도록 상단 고정) */}
                <div className="w-full mt-2 bg-gray-800 rounded-lg p-2 border border-gray-700/50 relative overflow-hidden">
                  {/* 게이지 바 배경 */}
                  <div className="absolute inset-0 bg-gray-900/50"></div>
                  {/* 게이지 바 채움 */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-600/30 to-purple-600/30 transition-all duration-500 ease-out"
                    style={{ width: `${votePercent}%` }}
                  ></div>

                  <div className="relative z-10 flex justify-between items-center w-full px-1">
                    <div className="flex items-center gap-1.5">
                      {/* 🚨 [수정] 투표 중 상태 표시 */}
                      {isVoting ? <span className="text-xs font-black text-pink-400 animate-pulse">🔥 투표 중</span> : <span className="text-xs font-black text-gray-500">투표율</span>}
                      <span className="text-[10px] text-gray-400 font-mono">({votePercent}%)</span>
                    </div>
                    <span className="text-xs font-bold text-white tracking-wider">
                      <span className="text-pink-300">{currentVoted}</span> / {totalOnline}명
                    </span>
                  </div>
                </div>
              </div>
              {stageInfo?.status === 'ready' ? (
                isApplied ? (
                  <div className="bg-indigo-900/40 border-2 border-indigo-500 p-3 rounded-lg relative mb-4">
                    <div className="text-white font-black text-sm truncate pr-10">🎵 {adminArtist} - {adminSong}</div>
                    <div className="text-indigo-300 text-[10px] font-bold mt-1 truncate pr-10">신청자: {adminChallengerName} <span className="text-gray-400">| {adminChallengeId}</span></div>
                    <button onClick={() => setIsApplied(false)} className="absolute top-2 right-2 text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors shadow">수정</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mb-4 w-full">
                    <div className="flex gap-2 w-full">
                      <input value={adminArtist} onChange={(e) => setAdminArtist(e.target.value)} className="w-1/2 min-w-0 p-2 bg-gray-800 border border-gray-600 rounded text-sm text-white font-bold outline-none" placeholder="가수명" />
                      <input value={adminSong} onChange={(e) => setAdminSong(e.target.value)} className="w-1/2 min-w-0 p-2 bg-gray-800 border border-gray-600 rounded text-sm text-white font-bold outline-none" placeholder="곡 제목" />
                    </div>
                    <div className="flex gap-2 w-full items-stretch">
                      <input value={adminChallengerName} onChange={(e) => setAdminChallengerName(e.target.value)} className="w-1/3 min-w-0 p-2 bg-gray-800 border border-indigo-600 rounded text-sm text-indigo-300 font-bold outline-none" placeholder="신청자" />
                      <input value={adminChallengeId} onChange={(e) => setAdminChallengeId(e.target.value)} className="flex-1 min-w-0 p-2 bg-gray-900 border border-gray-700 rounded text-sm text-gray-500 outline-none" placeholder="고유값" />
                      <button onClick={handleApplyChallengeId} className="w-12 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition-colors flex items-center justify-center">적용</button>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full p-2 bg-black border border-green-500 rounded text-sm text-green-400 font-bold text-center">
                  🎵 {adminArtist} - {adminSong}
                </div>
              )}

              <div className="flex items-center justify-between bg-gray-800 p-2 rounded mt-1 border border-gray-700">
                <span className="text-gray-300 text-xs font-bold">🎯 점수 연출</span>
                <div className="flex gap-1">
                  <button onClick={() => { if (stageInfo?.status !== 'ready') return alert("🚫 대기 상태에서 변경해주세요."); setAdminScoreMode('realtime'); }} className={`px-2 py-1 text-[10px] rounded transition-colors ${adminScoreMode === 'realtime' ? 'bg-yellow-500 text-black font-black' : 'bg-gray-700 text-gray-400'}`}>실시간</button>
                  <button onClick={() => { if (stageInfo?.status !== 'ready') return alert("🚫 대기 상태에서 변경해주세요."); setAdminScoreMode('blind'); }} className={`px-2 py-1 text-[10px] rounded transition-colors ${adminScoreMode === 'blind' ? 'bg-purple-600 text-white font-black' : 'bg-gray-700 text-gray-400'}`}>블라인드</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={startPerformance} disabled={!isReady} className={`py-3 px-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-lg transition-colors leading-tight whitespace-nowrap ${!isReady ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-green-600 hover:bg-green-500'}`}>
                  {isReady ? "🚀 카운트 & 시작" : (stageInfo?.status === 'countdown' || stageInfo?.status === 'playing') ? "▶️ 진행 중" : "▶️ 대기 중"}
                </button>
                <button onClick={revealTitle} disabled={!stageInfo?.titleHidden} className={`py-3 px-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-lg leading-tight whitespace-nowrap ${!stageInfo?.titleHidden ? 'bg-gray-700 cursor-not-allowed text-gray-500' : 'bg-purple-600 hover:bg-purple-500 animate-pulse'}`}>
                  {!stageInfo?.titleHidden ? "✅ 제목 공개됨" : "✨ 제목 공개"}
                </button>
                <button onClick={() => updateStage('ended')} disabled={isEnded || isReady} className={`p-3 rounded-lg text-white font-bold text-sm shadow-lg ${isEnded || isReady ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-gray-600 hover:bg-gray-500'}`}>
                  {isEnded ? "✅ 노래 종료됨" : "⏹️ 노래 종료"}
                </button>
                <button onClick={revealScore} disabled={adminScoreMode === 'realtime' || !stageInfo?.scoreHidden || isReady} className={`p-3 rounded-lg text-white font-bold text-sm shadow-lg transition-all ${adminScoreMode === 'realtime' || !stageInfo?.scoreHidden || isReady ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-500 animate-bounce'}`}>
                  {isReady ? "🚫 대기 중" : !stageInfo?.scoreHidden && adminScoreMode === 'blind' ? "✅ 점수 공개됨" : "🎉 점수 발표"}
                </button>
                <button onClick={async () => { if (!adminChallengeId) return alert("적용된 신청곡이 없습니다."); if (!window.confirm("이 무대를 완료 처리하시겠습니까? (통계에 즉시 반영됩니다)")) return; try { await updateDoc(doc(db, "challenges", adminChallengeId), { status: 'completed' }); alert("무대 완료 처리가 되었습니다."); } catch (e) { console.error(e); alert("오류가 발생했습니다."); } }} disabled={isReady} className={`p-3 rounded-lg text-white font-bold text-sm shadow-lg col-span-2 transition-all ${isReady ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 animate-pulse'}`}>
                  🏁 무대 완료 처리 (통계 반영)
                </button>
                <div className="flex gap-1 col-span-2 mt-2">
                  <button onClick={() => toggleMaintenance(true)} className={`flex-1 py-3 rounded-lg text-xs font-bold shadow-lg ${stageInfo?.maintenance ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'}`}>🔒 정비 모드 ON</button>
                  <button onClick={() => toggleMaintenance(false)} className={`flex-1 py-3 rounded-lg text-xs font-bold shadow-lg ${!stageInfo?.maintenance ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}>🔓 정비 OFF</button>
                </div>

                <div className="col-span-2 flex gap-2 mt-2">
                  <button onClick={handleUpdateRanking} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg text-white font-bold text-[11px] shadow-lg">
                    🏆 순위 업데이트
                  </button>
                  <button onClick={handleRefreshAudience} className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg text-white font-bold text-[11px] shadow-lg">
                    🔄 객석 업데이트
                  </button>
                </div>

                {/* 🚨 DB의 이전 데이터까지 공백('')으로 완전 덮어씌워서 좀비 데이터 방지 */}
                <button onClick={async () => { await setDoc(doc(db, 'stage', 'info'), { status: 'ready', songTitle: '', artist: '', song: '', challengerName: '', challengerUid: '', stageId: '', titleHidden: false, scoreHidden: true, count: null, updatedAt: new Date() }, { merge: true }); setAdminArtist(''); setAdminSong(''); setAdminChallengerName(''); setAdminChallengeId(''); setIsApplied(false); }} className="bg-red-800 py-3 rounded-lg text-white font-bold text-sm hover:bg-red-700 col-span-2 mt-2 shadow-lg">
                  🔄 무대 초기화 (대기)
                </button>
              </div>
            </div>
          )}

          {/* 팝업 토글 버튼 */}
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="bg-red-600/90 text-white px-4 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(220,38,38,0.5)] border-2 border-red-400 hover:bg-red-500 transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            {showAdminPanel ? '❌ 닫기' : '⚙️ 관리자 리모컨'}
          </button>
        </div>
      )}


    </div>
  );
};

export default AudiencePage;