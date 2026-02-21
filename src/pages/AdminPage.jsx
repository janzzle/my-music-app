import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, collection, query, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Trash2, CheckCircle, Music, Mic2, BarChart, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit3, Copy, RefreshCw } from 'lucide-react';
// 🚨 추가: 직접 만든 입력값 정제 유틸리티
import { sanitizeInput } from '../utils/sanitize';

const AdminPage = ({ socket, liveLeaderboard = [], dailyTopUsers = [], monthlyTopUsers = [], audienceList = [] }) => {
  const [adminArtist, setAdminArtist] = useState('');
  const [adminSong, setAdminSong] = useState('');
  const [stageInfo, setStageInfo] = useState({ status: 'ready', titleHidden: false, scoreHidden: true, maintenance: false });
  const [scoreMode, setScoreMode] = useState('realtime');

  const [activeTab, setActiveTab] = useState('queue');
  const [adminChallengeId, setAdminChallengeId] = useState('');
  const [adminChallengerName, setAdminChallengerName] = useState('');
  const [isApplied, setIsApplied] = useState(false); // 🚨 적용 상태 추가

  // 🚨 통합 데이터 상태
  const [allChallenges, setAllChallenges] = useState([]);
  const [challenges, setChallenges] = useState([]); // 대기열(pending) 전용

  // 🚨 정렬 상태 추가
  const [recordSort, setRecordSort] = useState({ key: 'timestamp', order: 'desc' });
  const [statsSort, setStatsSort] = useState({ key: 'createdAt', order: 'desc' });
  const [statsSearchChallenger, setStatsSearchChallenger] = useState('');
  const [statsStatusFilter, setStatsStatusFilter] = useState('all'); // 🚨 통계 전용 상태 필터 추가

  const handleRecordSort = (key) => setRecordSort({ key, order: recordSort.key === key && recordSort.order === 'desc' ? 'asc' : 'desc' });
  const handleStatsSort = (key) => setStatsSort({ key, order: statsSort.key === key && statsSort.order === 'desc' ? 'asc' : 'desc' });

  // 🚨 무대 기록 관리(Records) 상태
  const [groupedData, setGroupedData] = useState([]);
  const [recordArtistSearch, setRecordArtistSearch] = useState('');
  const [recordSongSearch, setRecordSongSearch] = useState('');
  const [recordDateSearch, setRecordDateSearch] = useState('');
  const [recordScoreSearch, setRecordScoreSearch] = useState('');

  // 🚨 통계(Stats) 상태
  const [statsPeriod, setStatsPeriod] = useState('all');
  const [statsDate, setStatsDate] = useState(new Date());
  const [statsSearchArtist, setStatsSearchArtist] = useState('');
  const [statsSearchSong, setStatsSearchSong] = useState('');
  const [statsDetail, setStatsDetail] = useState({ requested: [], played: [], totalReq: 0, totalPlayed: 0 });

  // 🚨 참가자 목록 상태
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // 🚨 [추가] 참가자 목록 필터 및 정렬 상태
  const [userFilterOnline, setUserFilterOnline] = useState(false);
  const [userSort, setUserSort] = useState({ key: 'name', order: 'asc' });
  const handleUserSort = (key) => setUserSort({ key, order: userSort.key === key && userSort.order === 'desc' ? 'asc' : 'desc' });

  useEffect(() => {
    // 🚨 5단계 최적화: 탭을 열 때만 getDocs로 단발성 호출하여 전체 유저(참가자)를 가져오게 변경
    const fetchUsers = async () => {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      const users = [];
      snapshot.forEach(docSnap => users.push({ id: docSnap.id, ...docSnap.data() }));
      setAllUsers(users);
    };

    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const grantTicket = async (userId, currentTickets) => {
    const input = window.prompt(`현재 티켓: ${currentTickets || 0}장\n지급(+) 또는 차감(-)할 티켓 수량을 입력하세요.\n(예: 2, -1)`, "1");
    if (!input) return;
    const amount = parseInt(input, 10);
    if (isNaN(amount)) return alert("숫자만 입력해주세요.");
    const newCount = (currentTickets || 0) + amount;
    if (newCount < 0) return alert("티켓은 0개 미만으로 설정할 수 없습니다.");
    await updateDoc(doc(db, "users", userId), { extraTickets: newCount });
    alert(`티켓이 ${amount > 0 ? '지급' : '차감'}되었습니다. (총 ${newCount}장)`);
  };

  // 🚨 [추가] 객석 실시간 새로고침 (Ping-Pong 로직)
  const handleRefreshAudience = async () => {
    if (!window.confirm("현재 실제로 접속 중인 관객을 확인하고 오프라인 유저를 정리하시겠습니까?\n(유저 생존 응답 대기를 위해 약 5초가 소요됩니다)")) return;

    const pingTime = Date.now();
    try {
      // 1. 전체 유저에게 출석체크(Ping) 신호 보내기
      await updateDoc(doc(db, "stage", "info"), { pingTime });

      // 2. 5초 대기 (유저들이 Pong 응답을 보낼 시간)
      alert("관객들의 생존 응답을 기다리는 중입니다... (5초 후 자동 처리됨)");

      setTimeout(async () => {
        // 3. 응답하지 않은 유저들 오프라인 처리 (Sweep)
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);

        const batch = writeBatch(db);
        let offlineCount = 0;

        snap.forEach(d => {
          const u = d.data();
          // 온라인으로 표시되어 있으나, 이번 출석체크(pingTime)에 응답(lastPong)하지 않은 사람
          if (u.isOnline && u.lastPong !== pingTime) {
            batch.update(d.ref, { isOnline: false });
            offlineCount++;
          }
        });

        if (offlineCount > 0) {
          await batch.commit(); // 한 번에 업데이트 (비용 절약)
        }
        alert(`✨ 객석 정리 완료!\n${offlineCount}명의 미응답 유저가 오프라인으로 전환되었습니다.`);
      }, 5000);

    } catch (error) {
      console.error(error);
      alert("객석 새로고침 중 오류가 발생했습니다.");
    }
  };

  // 1. 무대 정보 동기화
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stage', 'info'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStageInfo(data);
        if (data.artist) setAdminArtist(data.artist);
        if (data.song) setAdminSong(data.song);
        if (data.challengerName) setAdminChallengerName(data.challengerName);
        if (data.challengerUid) setAdminChallengeId(data.challengerUid);
      }
    });
    return () => unsub();
  }, []);

  // 2. 모든 도전 신청 데이터 가져오기
  useEffect(() => {
    const q = query(collection(db, "challenges"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });
      setAllChallenges(list);
      setChallenges(list.filter(c => c.status === 'pending'));
    });
    return () => unsubscribe();
  }, []);

  // 3. 무대 기록 관리 (서버 최적화: 'stage_results' 컬렉션 사용)
  useEffect(() => {
    const q = query(collection(db, "stage_results"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach(docSnap => {
        results.push({ id: docSnap.id, ...docSnap.data() });
      });
      results.sort((a, b) => b.timestamp - a.timestamp);
      setGroupedData(results);
    });
    return () => unsubscribe();
  }, []);

  // 4. 도전 신청곡 통계 계산 (기간 필터 및 신청/재생 구분 적용)
  useEffect(() => {
    let reqCounts = {};
    let playedCounts = {};

    const isDateInPeriod = (dateStr) => {
      if (statsPeriod === 'all') return true;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const rDate = new Date(statsDate);

      if (statsPeriod === 'daily') return d.toDateString() === rDate.toDateString();
      else if (statsPeriod === 'monthly') return d.getMonth() === rDate.getMonth() && d.getFullYear() === rDate.getFullYear();
      else if (statsPeriod === 'weekly') {
        const start = new Date(rDate);
        start.setDate(rDate.getDate() - rDate.getDay());
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }
      return false;
    };

    allChallenges.forEach(data => {
      const cDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      if (!isDateInPeriod(cDate)) return;

      const key = `${data.artist} - ${data.song}`;

      if (!reqCounts[key]) reqCounts[key] = { artist: data.artist, song: data.song, count: 0 };
      reqCounts[key].count += 1;

      if (data.status === 'completed' || data.status === 'playing') {
        if (!playedCounts[key]) playedCounts[key] = { artist: data.artist, song: data.song, count: 0 };
        playedCounts[key].count += 1;
      }
    });

    setStatsDetail({
      requested: Object.values(reqCounts).sort((a, b) => b.count - a.count),
      played: Object.values(playedCounts).sort((a, b) => b.count - a.count),
      totalReq: Object.values(reqCounts).reduce((a, b) => a + b.count, 0),
      totalPlayed: Object.values(playedCounts).reduce((a, b) => a + b.count, 0)
    });
  }, [allChallenges, statsPeriod, statsDate]);

  const handleApplyChallengeId = () => {
    if (!adminChallengeId) return alert("고유값을 입력해주세요.");
    const found = allChallenges.find(c => c.id === adminChallengeId);
    if (found) {
      setAdminArtist(found.artist);
      setAdminSong(found.song);
      setAdminChallengerName(found.applicantName || '익명 도전자');
      setIsApplied(true);
    } else {
      alert("해당 고유값을 가진 신청곡을 찾을 수 없습니다.");
    }
  };

  const updateStage = async (newStatus, artist = adminArtist, song = adminSong) => {
    const fullTitle = artist && song ? `${artist} - ${song}` : '';
    const newStageId = newStatus === 'countdown' ? (adminChallengeId || Date.now().toString()) : stageInfo.stageId;

    const updateData = { status: newStatus, songTitle: fullTitle, artist: artist, song: song, challengerName: adminChallengerName || '익명 도전자', challengerUid: adminChallengeId, updatedAt: new Date() };

    if (newStatus === 'countdown') {
      updateData.count = 5; updateData.stageId = newStageId; updateData.titleHidden = true; updateData.scoreMode = scoreMode; updateData.scoreHidden = true;
      if (adminChallengeId) await updateDoc(doc(db, "challenges", adminChallengeId), { status: 'playing' }).catch(() => { });
    } else if (newStatus === 'ready') {
      updateData.stageId = ''; updateData.count = null; updateData.titleHidden = false; updateData.scoreHidden = true;
      setAdminChallengeId(''); setAdminChallengerName(''); setAdminArtist(''); setAdminSong('');
    } else if (newStatus === 'ended') {
      if (stageInfo.stageId) {
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
            stageId: stageInfo.stageId, songTitle: stageInfo.songTitle, artist: stageInfo.artist, song: stageInfo.song, challengerName: stageInfo.challengerName || '익명 도전자', challengerUid: stageInfo.challengerUid || '', points: totalPoints, voteCount: voteCount, timestamp: new Date()
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

  const selectChallenge = (item) => {
    setAdminArtist(item.artist);
    setAdminSong(item.song);
    setAdminChallengerName(item.applicantName || '익명 도전자');
    setAdminChallengeId(item.id);
  };

  const handleEditQueue = async (item) => {
    const rawArtist = prompt("가수명을 수정하세요 (최대 100자):", item.artist);
    if (rawArtist === null) return;

    const rawSong = prompt("곡 제목을 수정하세요 (최대 100자):", item.song);
    if (rawSong === null) return;

    const rawName = prompt("도전자 닉네임을 수정하세요 (최대 50자):", item.applicantName);
    if (rawName === null) return;

    // 🚨 여기서 정제(Sanitize) 시작 (태그 치환 및 각각 적절한 글자 수로 제한)
    const newArtist = sanitizeInput(rawArtist, 100);
    const newSong = sanitizeInput(rawSong, 100);
    const newName = sanitizeInput(rawName, 50);

    // 정제된 값이 비어버리면(예: 띄어쓰기만 쳤을 때) 통과 안됨
    if (!newArtist || !newSong || !newName) {
      return alert("값이 올바르지 않거나 너무 짧습니다. 다시 시도해주세요.");
    }

    await updateDoc(doc(db, "challenges", item.id), {
      artist: newArtist,
      song: newSong,
      applicantName: newName
    });
    alert("수정되었습니다.");
  };

  const getPlayCount = (artist, song) => {
    return allChallenges.filter(c => c.artist === artist && c.song === song && (c.status === 'completed' || c.status === 'playing')).length;
  };

  // 🚨 무대 상태 수동 정정 (통계 관리 반영) - 드롭다운 선택 시 즉시 확인
  const handleUpdateChallengeStatus = async (id, newStatus) => {
    let statusName = '';
    if (newStatus === 'pending') statusName = '⏳ 대기중 (단순신청)';
    else if (newStatus === 'playing') statusName = '▶️ 카운트/진행중';
    else if (newStatus === 'completed') statusName = '✅ 완료됨';

    if (!window.confirm(`정말 이 신청곡을 [${statusName}] 상태로 변경하시겠습니까?`)) return;

    try {
      await updateDoc(doc(db, "challenges", id), { status: newStatus });
    } catch (error) {
      console.error(error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const [statsDateSearch, setStatsDateSearch] = useState(''); // 🚨 통계 달력 검색 통일

  const completeChallenge = async (id) => {
    if (!window.confirm("이 신청곡을 [도전 완료(재생됨)] 처리하시겠습니까?\n(통계의 '도전 시작 곡' 카운트에 반영됩니다)")) return;
    await updateDoc(doc(db, "challenges", id), { status: 'completed' });
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm("이 신청곡을 대기열에서 완전히 [영구 삭제]하시겠습니까?\n(통계에서도 완전히 제외됩니다)")) return;
    await deleteDoc(doc(db, "challenges", id));
  };

  const handleEditRecordTitle = async (group) => {
    const rawArtist = window.prompt("새로운 가수명을 입력하세요:", group.artist);
    if (rawArtist === null) return;
    const rawSong = window.prompt("새로운 곡 제목을 입력하세요:", group.song);
    if (rawSong === null) return;

    // 🚨 동일한 정제 로직 사용
    const newArtist = sanitizeInput(rawArtist, 100);
    const newSong = sanitizeInput(rawSong, 100);

    if (!newArtist || !newSong) {
      return alert("값이 올바르지 않거나 너무 짧습니다. 다시 시도해주세요.");
    }

    await updateDoc(doc(db, "stage_results", group.id), {
      artist: newArtist,
      song: newSong,
      songTitle: `${newArtist} - ${newSong}`
    });
    alert("수정되었습니다.");
  };

  const handleDeleteRecord = async (group) => {
    if (!window.confirm(`정말 이 무대 기록을 삭제하시겠습니까?\n(데이터베이스에서 영구 삭제됩니다)`)) return;
    await deleteDoc(doc(db, "stage_results", group.id));
    alert("삭제가 완료되었습니다.");
  };

  const toggleMaintenance = async (val) => {
    await setDoc(doc(db, 'stage', 'info'), { maintenance: val }, { merge: true });
  };

  const handleStatsPrev = () => {
    const newDate = new Date(statsDate);
    if (statsPeriod === 'daily') newDate.setDate(newDate.getDate() - 1);
    else if (statsPeriod === 'weekly') newDate.setDate(newDate.getDate() - 7);
    else if (statsPeriod === 'monthly') newDate.setMonth(newDate.getMonth() - 1);
    setStatsDate(newDate);
  };
  const handleStatsNext = () => {
    const newDate = new Date(statsDate);
    if (statsPeriod === 'daily') newDate.setDate(newDate.getDate() + 1);
    else if (statsPeriod === 'weekly') newDate.setDate(newDate.getDate() + 7);
    else if (statsPeriod === 'monthly') newDate.setMonth(newDate.getMonth() + 1);
    setStatsDate(newDate);
  };
  const getStatsDateTitle = () => {
    if (statsPeriod === 'daily') return `${statsDate.getMonth() + 1}.${statsDate.getDate()}`;
    if (statsPeriod === 'monthly') return `${statsDate.getFullYear()}.${statsDate.getMonth() + 1}`;
    if (statsPeriod === 'weekly') {
      const start = new Date(statsDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getMonth() + 1}.${start.getDate()}~${end.getMonth() + 1}.${end.getDate()}`;
    }
    return '';
  };

  const isReady = stageInfo.status === 'ready';
  const isEnded = stageInfo.status === 'ended';
  const isVoting = stageInfo.status === 'voting';

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white p-6 pt-16 md:pt-24 flex flex-col items-center">

      {/* 🚨 탭 네비게이션 */}
      <div className="w-full max-w-7xl flex gap-4 md:gap-6 border-b border-gray-700 mb-8 overflow-x-auto shrink-0 scrollbar-hide">
        <button onClick={() => setActiveTab('queue')} className={`font-black text-sm md:text-base pb-3 border-b-4 transition-colors whitespace-nowrap ${activeTab === 'queue' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          📋 도전 신청곡 목록
        </button>
        <button onClick={() => setActiveTab('records')} className={`font-black text-sm md:text-base pb-3 border-b-4 transition-colors whitespace-nowrap ${activeTab === 'records' ? 'border-blue-400 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          🗄️ 무대 기록 관리
        </button>
        <button onClick={() => setActiveTab('stats')} className={`font-black text-sm md:text-base pb-3 border-b-4 transition-colors whitespace-nowrap ${activeTab === 'stats' ? 'border-pink-400 text-pink-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          📈 도전 신청곡 통계 관리
        </button>
        <button onClick={() => setActiveTab('users')} className={`font-black text-sm md:text-base pb-3 border-b-4 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-green-400 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          👥 참가자 목록
        </button>
      </div>

      {activeTab === 'queue' ? (
        /* ================= 2. 도전 신청곡 목록 ================= */
        <div className="w-full max-w-7xl bg-gray-800 rounded-xl border border-indigo-500/30 p-6 shadow-2xl overflow-hidden">
          <h2 className="text-xl font-bold text-indigo-400 flex items-center gap-2 mb-4"><Mic2 className="w-5 h-5 md:w-6 md:h-6" /> 실시간 도전 신청곡 목록 (대기열)</h2>
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
      ) : activeTab === 'records' ? (
        /* ================= 3. 무대 기록 관리 (집계 완료) ================= */
        <div className="w-full max-w-7xl bg-gray-800 rounded-xl border border-blue-500/30 p-6 shadow-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2"><BarChart className="w-5 h-5 md:w-6 md:h-6" /> 무대 기록 관리 (집계 완료 데이터)</h2>
            <div className="flex flex-wrap gap-2">
              <input type="text" value={recordArtistSearch} onChange={(e) => setRecordArtistSearch(e.target.value)} placeholder="🔍 가수 검색" className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none text-white w-32 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all shadow-inner" />
              <input type="text" value={recordSongSearch} onChange={(e) => setRecordSongSearch(e.target.value)} placeholder="🔍 제목 검색" className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none text-white w-32 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all shadow-inner" />
              <input type="date" value={recordDateSearch} onChange={(e) => setRecordDateSearch(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none text-white w-36 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all cursor-pointer shadow-inner" />
            </div>
          </div>
          <div className="w-full overflow-x-auto border border-gray-700 rounded-lg bg-gray-900 max-h-175">
            <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
              <thead className="bg-black text-gray-400 uppercase text-xs sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800" onClick={() => handleRecordSort('timestamp')}>날짜&시간 {recordSort.key === 'timestamp' && (recordSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-blue-300 cursor-pointer hover:bg-gray-800" onClick={() => handleRecordSort('artist')}>가수 {recordSort.key === 'artist' && (recordSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-white cursor-pointer hover:bg-gray-800" onClick={() => handleRecordSort('song')}>제목 {recordSort.key === 'song' && (recordSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-center text-indigo-300 cursor-pointer hover:bg-gray-800" onClick={() => handleRecordSort('challengerName')}>신청자 {recordSort.key === 'challengerName' && (recordSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-center text-yellow-400 cursor-pointer hover:bg-gray-800" onClick={() => handleRecordSort('points')}>점수 {recordSort.key === 'points' && (recordSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-center">같은 곡 이력</th>
                  <th className="p-3 border-b border-gray-700 text-center">수정</th>
                  <th className="p-3 border-b border-gray-700 text-center">삭제</th>
                  <th className="p-3 border-b border-gray-700">고유값</th>
                </tr>
              </thead>
              <tbody>
                {[...groupedData].sort((a, b) => {
                  let valA = a[recordSort.key]; let valB = b[recordSort.key];
                  if (recordSort.key === 'timestamp') { valA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0; valB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0; }
                  else if (recordSort.key === 'points') { valA = Number(valA || 0); valB = Number(valB || 0); }
                  if (valA < valB) return recordSort.order === 'asc' ? -1 : 1;
                  if (valA > valB) return recordSort.order === 'asc' ? 1 : -1;
                  return 0;
                }).filter(g => {
                  const matchA = g.artist ? g.artist.toLowerCase().includes(recordArtistSearch.toLowerCase()) : true;
                  const matchS = g.song ? g.song.toLowerCase().includes(recordSongSearch.toLowerCase()) : true;
                  const matchD = recordDateSearch ? new Date(g.timestamp?.toDate ? g.timestamp.toDate() : g.timestamp).toISOString().startsWith(recordDateSearch) : true;
                  return matchA && matchS && matchD;
                }).map(group => (
                  <tr key={group.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="p-3 text-xs font-mono">{group.timestamp?.toDate ? group.timestamp.toDate().toLocaleString() : new Date(group.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold text-blue-200">{group.artist}</td>
                    <td className="p-3 font-bold text-white">{group.song}</td>
                    <td className="p-3 text-center text-indigo-300">{group.challengerName || '익명'}</td>
                    <td className="p-3 text-center text-yellow-400 font-bold">{group.points}점</td>
                    <td className="p-3 text-center text-gray-400">{getPlayCount(group.artist, group.song)}회</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleEditRecordTitle(group)} className="p-1.5 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"><Edit3 className="w-4 h-4 md:w-5 md:h-5" /></button>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleDeleteRecord(group)} className="p-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                    </td>
                    <td className="p-3 text-[10px] text-gray-500 font-mono truncate max-w-[80px]">{group.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'stats' && (
        /* ================= 4. 도전 신청곡 통계 관리 ================= */
        <div className="w-full max-w-7xl bg-gray-800 rounded-xl border border-pink-500/30 p-6 shadow-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-pink-400 flex items-center gap-2"><BarChart className="w-5 h-5 md:w-6 md:h-6" /> 도전 신청곡 통계 관리</h2>

            <div className="flex flex-wrap items-center gap-2">
              <input type="text" value={statsSearchArtist} onChange={(e) => setStatsSearchArtist(e.target.value)} placeholder="🔍 가수 검색" className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none text-white w-32 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all shadow-inner" />
              <input type="text" value={statsSearchSong} onChange={(e) => setStatsSearchSong(e.target.value)} placeholder="🔍 제목 검색" className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none text-white w-32 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all shadow-inner" />
              <input type="text" value={statsSearchChallenger} onChange={(e) => setStatsSearchChallenger(e.target.value)} placeholder="🔍 신청자 검색" className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none text-white w-32 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all shadow-inner" />
              <input type="date" value={statsDateSearch} onChange={(e) => setStatsDateSearch(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none text-white w-36 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all cursor-pointer shadow-inner" />

              <select value={statsStatusFilter} onChange={(e) => setStatsStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none text-white focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all cursor-pointer shadow-inner">
                <option value="all">전체 상태</option>
                <option value="pending">⏳ 단순 신청</option>
                <option value="playing">▶️ 진행/카운트</option>
                <option value="completed">✅ 완료됨</option>
              </select>
            </div>
          </div>

          {/* 🚨 기존의 리스트 뷰를 엑셀식 상세 테이블 뷰로 완전 개편 */}
          <div className="w-full overflow-x-auto border border-gray-700 rounded-lg bg-gray-900 max-h-[700px]">
            <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
              <thead className="bg-black text-gray-400 uppercase text-xs sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800" onClick={() => handleStatsSort('createdAt')}>날짜&시간 {statsSort.key === 'createdAt' && (statsSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-blue-300 cursor-pointer hover:bg-gray-800" onClick={() => handleStatsSort('artist')}>가수 {statsSort.key === 'artist' && (statsSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-white cursor-pointer hover:bg-gray-800" onClick={() => handleStatsSort('song')}>제목 {statsSort.key === 'song' && (statsSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-center text-indigo-300 cursor-pointer hover:bg-gray-800" onClick={() => handleStatsSort('applicantName')}>신청자 {statsSort.key === 'applicantName' && (statsSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-center text-pink-400">누적 신청 건수</th>
                  <th className="p-3 border-b border-gray-700 text-center cursor-pointer hover:bg-gray-800" onClick={() => handleStatsSort('status')}>무대 상태 {statsSort.key === 'status' && (statsSort.order === 'desc' ? '▼' : '▲')}</th>
                  <th className="p-3 border-b border-gray-700 text-center">삭제</th>
                </tr>
              </thead>
              <tbody>
                {[...allChallenges].filter(c => {
                  const matchA = c.artist ? c.artist.toLowerCase().includes(statsSearchArtist.toLowerCase()) : true;
                  const matchS = c.song ? c.song.toLowerCase().includes(statsSearchSong.toLowerCase()) : true;
                  const matchC = c.applicantName ? c.applicantName.toLowerCase().includes(statsSearchChallenger.toLowerCase()) : true;
                  const matchStatus = statsStatusFilter === 'all' ? true : c.status === statsStatusFilter;
                  const matchD = statsDateSearch ? new Date(c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt).toISOString().startsWith(statsDateSearch) : true;

                  return matchA && matchS && matchC && matchStatus && matchD;
                }).sort((a, b) => {
                  let valA = a[statsSort.key] || ''; let valB = b[statsSort.key] || '';
                  if (statsSort.key === 'createdAt') { valA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0; valB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0; }
                  if (valA < valB) return statsSort.order === 'asc' ? -1 : 1;
                  if (valA > valB) return statsSort.order === 'asc' ? 1 : -1;
                  return 0;
                }).map(item => (
                  <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="p-3 text-xs font-mono">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : '방금'}</td>
                    <td className="p-3 font-bold text-blue-200">{item.artist}</td>
                    <td className="p-3 font-bold text-white">{item.song}</td>
                    <td className="p-3 text-center text-indigo-300">{item.applicantName || '익명'}</td>
                    <td className="p-3 text-center text-pink-400 font-bold">{allChallenges.filter(c => c.artist === item.artist && c.song === item.song).length}건</td>
                    <td className="p-3 text-center font-bold">
                      <select value={item.status || 'pending'} onChange={(e) => handleUpdateChallengeStatus(item.id, e.target.value)} className={`bg-transparent appearance-none border-none outline-none cursor-pointer text-sm font-bold text-center transition-opacity hover:opacity-70 ${item.status === 'completed' ? 'text-green-400' : item.status === 'playing' ? 'text-blue-400' : 'text-gray-400'}`}>
                        <option value="pending" className="bg-gray-800 text-gray-400">⏳ 대기중 (단순신청)</option>
                        <option value="playing" className="bg-gray-800 text-blue-400">▶️ 카운트/진행중</option>
                        <option value="completed" className="bg-gray-800 text-green-400">✅ 완료됨</option>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteChallenge(item.id); }} className="p-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'users' && (
        /* ================= 5. 참가자 목록 ================= */
        <div className="w-full max-w-7xl bg-gray-800 rounded-xl border border-green-500/30 p-6 shadow-2xl overflow-hidden">
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
              <button onClick={() => {
                // 수동 새로고침 버튼 
                const q = query(collection(db, "users"));
                getDocs(q).then(snapshot => {
                  const users = [];
                  snapshot.forEach(docSnap => users.push({ id: docSnap.id, ...docSnap.data() }));
                  setAllUsers(users);
                });
              }} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors">🔄 목록 갱신</button>
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
      )}
    </div>
  );
};

export default AdminPage;