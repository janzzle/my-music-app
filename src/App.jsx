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
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';

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
            if (!name || name === '익명 도전자') return;

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

          setDailyTopUsers(Object.entries(dailyScores).map(([name, pts]) => ({ name, pts })).sort((a,b) => b.pts - a.pts).slice(0,3));
          setMonthlyTopUsers(Object.entries(monthlyScores).map(([name, pts]) => ({ name, pts })).sort((a,b) => b.pts - a.pts).slice(0,3));
    });
    return () => unsub();
  }, []);
  // 🚨 수동 업데이트된 '현재 순위'를 DB에서 가져와 화면에 표시 (자동업데이트 방지)
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
          }
        } catch (error) {
          console.error("유저 정보 로딩 실패:", error);
        }
        setUser({ uid: currentUser.uid, name: userName || '익명' });
        setIsAdmin(adminStatus);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 실시간 무대 정보 동기화
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "stage", "info"), (doc) => {
      if (doc.exists()) {
        setStageInfo(doc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "votes"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scores = {};
      const todayStr = new Date().toDateString(); 

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // 1. 오늘 투표한 기록만 취합 (과거 기록 제외)
        if (data.timestamp && data.timestamp.toDate) {
          if (data.timestamp.toDate().toDateString() !== todayStr) return;
        }

        const key = data.stageId;
        if (!key) return;

        // 2. 점수 합산 준비
        if (!scores[key]) {
          scores[key] = { stageId: key, songTitle: data.songTitle || '알 수 없는 곡', points: 0 };
        }

        // 3. 점수 계산 공식 (둘 다=4점, 하나만=1점) - 🚨 에러 방어 적용
        let pts = 0;
        if (data.choices?.isUnknown && data.choices?.isLike) pts = 4;
        else if (data.choices?.isUnknown || data.choices?.isLike) pts = 1;

        scores[key].points += pts; // 점수 누적
      });

      // 4. 점수 내림차순 정렬 후 Top 3만 뽑아내기
      const sorted = Object.values(scores).sort((a, b) => b.points - a.points).slice(0, 3);
      setLiveLeaderboard(sorted);
    });

    return () => unsubscribe();
  }, []);

  // 3. 오늘 투표된 전체 기록 가져오기 (실시간 감지)
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

  // 4. 실시간 랭킹 집계 (블라인드 점수 유출 방지 적용)
  useEffect(() => {
    const scores = {};
    allVotes.forEach(data => {
      const key = data.stageId;
      if (!key) return;
      
      // 블라인드 모드 & 점수 비공개 상태인 '현재 무대'는 랭킹 계산에서 임시 제외!
      if (key === stageInfo.stageId && stageInfo.scoreMode === 'blind' && stageInfo.scoreHidden) return; 

      if (!scores[key]) scores[key] = { stageId: key, songTitle: data.songTitle || '알 수 없는 곡', points: 0 };
      
      // 🚨 에러 방어 적용
      let pts = 0;
      if (data.choices?.isUnknown && data.choices?.isLike) pts = 4;
      else if (data.choices?.isUnknown || data.choices?.isLike) pts = 1;
      scores[key].points += pts;
    });
    const sorted = Object.values(scores).sort((a, b) => b.points - a.points).slice(0, 3);
    setLiveLeaderboard(sorted);
  }, [allVotes, stageInfo]);

  // 5. 실시간 형광등(객석) 연동
  useEffect(() => {
    const currentVotes = allVotes.filter(v => v.stageId === stageInfo.stageId);
    // 🚨 본인의 실제 UID를 부여하여 랭킹 뱃지 및 색상이 정상 연동되도록 수정
    const myUser = { id: user?.uid || 0, name: user?.name || "나", voted: false, choices: { isUnknown: false, isLike: false } };
    const others = [];

    currentVotes.forEach(data => {
      if (user && data.uid === user.uid) { 
        myUser.voted = true; 
        // 🚨 choices 방어 적용
        myUser.choices = data.choices || { isUnknown: false, isLike: false }; 
      } else { 
        others.push(data); 
      }
    });

    const newAudience = [myUser];
    
    // 🚨 더미 데이터(가짜 관객 17명 생성)를 삭제하고 실제 투표한 참여자만 객석에 추가합니다.
    others.forEach((voteData, index) => {
      newAudience.push({
        id: voteData.uid || index + 1,
        name: voteData.name || `User${index + 1}`,
        voted: true,
        choices: voteData.choices || { isUnknown: false, isLike: false }
      });
    });
    setAudienceList(newAudience);
  }, [allVotes, stageInfo.stageId, user]);

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
      <GlobalStatusLayer socket={socket} />
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