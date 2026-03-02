import React, { useState, useEffect } from 'react';
import Navigation from './components/common/Navigation';
import LoginPage from './pages/LoginPage';
import AudiencePage from './pages/AudiencePage';
import CurrentSongPage from './pages/CurrentSongPage';
import GuidePage from './pages/GuidePage';
import HistoryPage from './pages/HistoryPage';
import ChallengePage from './pages/ChallengePage';
import MyPage from './pages/MyPage';
import AdminPage from './pages/AdminPage';
import BroadcastPage from './pages/BroadcastPage';
import GlobalStatusLayer from './components/common/GlobalStatusLayer';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, doc, getDoc, getDocs, updateDoc, setDoc, where } from 'firebase/firestore';
const socket = null;

export default function MusicPlatformApp() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState('audience');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [voteStatus, setVoteStatus] = useState({ isUnknown: false, isLike: false });

  const [stageInfo, setStageInfo] = useState({ status: 'ready', songTitle: '', stageId: '' });

  const [allVotes, setAllVotes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveLeaderboard, setLiveLeaderboard] = useState([]); // 🚨 백그라운드 집계용
  const [audienceList, setAudienceList] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // 🚨 객석에 앉힐 전체 가입자 명단
  // 🚨 일간/월간 Top 3 유저 판별용 상태
  const [dailyTopUsers, setDailyTopUsers] = useState([]);
  const [monthlyTopUsers, setMonthlyTopUsers] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "stage_results"));
    const unsub = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const todayStr = now.toDateString();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const dailyScores = {};
      const monthlyScores = {};

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // 🚨 테스트 계정도 인식할 수 있도록 무조건 '닉네임' 기준으로 합산
        const name = data.challengerName;
        if (!name || name === '익명 신청자') return;

        const d = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);

        // 일간 합산
        if (d.toDateString() === todayStr) {
          if (!dailyScores[name]) dailyScores[name] = 0;
          dailyScores[name] += data.points || 0;
        }
        // 월간 합산
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          if (!monthlyScores[name]) monthlyScores[name] = 0;
          monthlyScores[name] += data.points || 0;
        }
      });

      setDailyTopUsers(Object.entries(dailyScores).map(([name, pts]) => ({ name, pts })).sort((a, b) => b.pts - a.pts).slice(0, 3));
      setMonthlyTopUsers(Object.entries(monthlyScores).map(([name, pts]) => ({ name, pts })).sort((a, b) => b.pts - a.pts).slice(0, 3));
    });
    return () => unsub();
  }, []);
  // 🚨 5단계 객석 실시간 감지 복구 (isOnline: true 인 접속자만!)
  useEffect(() => {
    // 1만명 전체를 돌지 않고, 현재 접속 중인 사람만 쿼리! (과금 최적화)
    const q = query(collection(db, "users"), where("isOnline", "==", true));
    const unsub = onSnapshot(q, (snapshot) => {
      const activeUsers = [];
      snapshot.forEach(docSnap => {
        activeUsers.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAllUsers(activeUsers);
    });
    return () => unsub();
  }, []);

  // 🚨 수동 업데이트된 '현재 순위'를 DB에서 가져와 화면에 표시
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "stage", "ranking"), (docSnap) => {
      if (docSnap.exists()) setLeaderboard(docSnap.data().list || []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let userName = currentUser.displayName;
        let adminStatus = false;
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            userName = data.name;
            if (data.isAdmin === true) adminStatus = true;
          } else {
            // 🚨 [핵심] 옛날에 가입해서 DB에 누락된 계정(노트북)을 자동 복구하여 객석에 보이게 함
            await setDoc(userDocRef, { uid: currentUser.uid, name: userName || '익명', email: currentUser.email, createdAt: new Date() });
          }
        } catch (error) { console.error("유저 정보 로딩 실패:", error); }
        setUser({ uid: currentUser.uid, name: userName || '익명' });
        setIsAdmin(adminStatus);
      } else { setUser(null); setIsAdmin(false); }
    });
    return () => unsubscribe();
  }, []);

  // 🚨 [수정] 모바일 최적화: 브라우저 강제 종료 감지 확률을 높인 접속 상태 기록
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);

    // 접속 즉시 온라인 처리
    updateDoc(userRef, { isOnline: true }).catch(e => console.log(e));

    // 의도적인 로그아웃(handleLogout) 버튼 클릭 시에만 별도로 오프라인 처리함.
    // ※ 모바일에서 화면을 벗어나거나 홈버튼을 누를 때 억울하게 강퇴당하는 현상을 막기 위해 beforeunload 등의 이벤트를 전부 삭제!

    return () => {
      // 컴포넌트 언마운트 시 자동 오프라인 처리도 주석 처리 (관리자 업데이트로만 퇴장)
      // updateDoc(userRef, { isOnline: false }).catch(e => console.log(e));
    };
  }, [user]);

  // 실시간 무대 정보 동기화 및 🚨 관리자 객석 새로고침(Ping-Pong) 응답 및 객석 갱신 로직
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "stage", "info"), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStageInfo(data);

        // 🚨 관리자가 '객석 새로고침(Ping)'을 눌렀을 때의 응답(Pong) 로직
        if (user && data.pingTime) {
          const localLastPing = sessionStorage.getItem('lastPing');
          if (localLastPing !== data.pingTime.toString()) {
            sessionStorage.setItem('lastPing', data.pingTime.toString());
            updateDoc(doc(db, "users", user.uid), {
              isOnline: true,
              lastPong: data.pingTime
            }).catch(e => console.error("Pong 에러:", e));
          }
        }

        // 🚨 새로고침용 수동 getDocs 삭제 (새 위에 1.1번 코드로 실시간 onSnapshot 감지)
      }
    });
    return () => unsubscribe();
  }, [user]);

  /* 기존 중복되었던 실시간 랭킹(liveLeaderboard) 전용 useEffect 삭제 및 병합 */
  useEffect(() => {
    const q = query(collection(db, "votes"));
    const unsub = onSnapshot(q, (snapshot) => {
      const todayStr = new Date().toDateString();
      const votes = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.timestamp && data.timestamp.toDate && data.timestamp.toDate().toDateString() === todayStr) {
          votes.push(data);
        }
      });
      setAllVotes(votes);
    });
    return () => unsub();
  }, []);

  // 4. 실시간 랭킹 집계 (allVotes 값에 의존하도록 통합, 블라인드 점수 유출 방지 적용)
  useEffect(() => {
    const scores = {};
    allVotes.forEach(data => {
      const key = data.stageId;
      if (!key) return;

      // 블라인드 모드 & 점수 비공개 상태인 '현재 무대'는 랭킹 계산에서 임시 제외!
      if (key === stageInfo.stageId && stageInfo.scoreMode === 'blind' && stageInfo.scoreHidden) return;

      if (!scores[key]) scores[key] = { stageId: key, songTitle: data.songTitle || '알 수 없는 곡', challengerName: data.challengerName || '익명 신청자', points: 0 };

      // 🚨 에러 방어 적용
      let pts = 0;
      if (data.choices?.isUnknown && data.choices?.isLike) pts = 4;
      else if (data.choices?.isUnknown || data.choices?.isLike) pts = 1;
      scores[key].points += pts;
    });

    // 🚨 [최적화] 이전 랭킹과 다를 때만 업데이트 
    const sorted = Object.values(scores).sort((a, b) => b.points - a.points).slice(0, 3);
    setLiveLeaderboard(prev => JSON.stringify(prev) === JSON.stringify(sorted) ? prev : sorted);
  }, [allVotes, stageInfo]);

  // 5. 실시간 형광등(객석) 연동 (전체 가입자 기반)
  useEffect(() => {
    const currentVotes = allVotes.filter(v => v.stageId === stageInfo.stageId);

    // 1. 내 캐릭터를 1번 자리에 무조건 고정
    const myVote = currentVotes.find(v => v.uid === user?.uid);
    const newAudience = [{
      id: user?.uid || 0,
      name: user?.name || "나",
      voted: !!myVote,
      isOnline: true, // 🚨 내 캐릭터는 항상 접속 중이므로 true로 명시!
      choices: myVote ? myVote.choices : { isUnknown: false, isLike: false }
    }];

    // 2. 다른 가입자들을 뒤이어 착석 (🚨 현재 실시간 접속 중인 사람만 보이도록 수정!)
    allUsers.forEach(u => {
      if (user && u.uid === user.uid) return; // '나'는 1번에 앉았으니 패스
      if (!u.isOnline) return; // 오프라인 유저는 객석에서 제외!

      const voteData = currentVotes.find(v => v.uid === u.uid);
      newAudience.push({
        id: u.uid,
        name: u.name || '익명',
        voted: !!voteData,
        isOnline: u.isOnline, // 🚨 AudiencePage 투표율 계산을 위해 isOnline 속성 추가 넘김!
        choices: voteData ? voteData.choices : { isUnknown: false, isLike: false }
      });
    });

    setAudienceList(newAudience);
  }, [allUsers, allVotes, stageInfo.stageId, user]);

  const handleLogout = async () => {
    await signOut(auth);
    setIsMenuOpen(false);
    setIsSignupMode(false);
    setCurrentPage('audience');
    alert("로그아웃 되었습니다.");
  };

  const navigateTo = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
  };

  if (!user) return <LoginPage isSignupMode={isSignupMode} setIsSignupMode={setIsSignupMode} />;

  return (
    <div className="font-sans text-gray-900 bg-gray-50 min-h-screen relative pb-16">
      <GlobalStatusLayer socket={socket} currentPage={currentPage} />
      <Navigation
        isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen}
        user={user} handleLogout={handleLogout}
        setIsSignupMode={setIsSignupMode} navigateTo={navigateTo}
        isAdmin={isAdmin}
        currentPage={currentPage}
      />

      {currentPage === 'audience' && (
        <AudiencePage audienceList={audienceList} user={user} stageInfo={stageInfo} socket={socket} isAdmin={isAdmin} leaderboard={leaderboard} liveLeaderboard={liveLeaderboard} dailyTopUsers={dailyTopUsers} monthlyTopUsers={monthlyTopUsers} />
      )}

      {currentPage === 'broadcast' && isAdmin && (
        <BroadcastPage audienceList={audienceList} stageInfo={stageInfo} socket={socket} leaderboard={leaderboard} dailyTopUsers={dailyTopUsers} monthlyTopUsers={monthlyTopUsers} />
      )}

      {currentPage === 'currentSong' && (
        <CurrentSongPage voteStatus={voteStatus} setVoteStatus={setVoteStatus} navigateTo={navigateTo} stageInfo={stageInfo} />
      )}

      {currentPage === 'mypage' && <MyPage />}
      {currentPage === 'guide' && <GuidePage navigateTo={navigateTo} />}
      {currentPage === 'history' && <HistoryPage />}
      {currentPage === 'challenge' && <ChallengePage />}
      {currentPage === 'admin' && isAdmin && (
        <AdminPage socket={socket} liveLeaderboard={liveLeaderboard} dailyTopUsers={dailyTopUsers} monthlyTopUsers={monthlyTopUsers} audienceList={audienceList} />
      )}
      <footer className="absolute bottom-0 left-0 w-full bg-black/90 text-gray-500 text-[9px] md:text-[10px] py-4 text-center border-t border-gray-800 flex flex-col items-center justify-center leading-tight">
        <p>본 웹 서비스의 시스템 및 방송 프로그램 구성에 대한 저작권은 <span className="text-gray-300 font-bold">unknown</span>에게 귀속됩니다.</p>
        <p className="mt-0.5 font-mono text-gray-600">
          &copy; 2026 unknown. All rights reserved. The web system and broadcast format are the intellectual property of unknown.
        </p>
      </footer>
    </div>
  );
}