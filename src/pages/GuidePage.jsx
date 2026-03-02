import React from 'react';
import { Radio, Star, Music2, PenTool, ArrowRight, Zap } from 'lucide-react';

const GuidePage = ({ navigateTo }) => (
  // 패딩과 너비를 적절히 늘려 시원하게 만듭니다.
  <div className="p-6 max-w-4xl mx-auto h-screen overflow-y-auto pt-24 pb-32 font-sans text-gray-800">
    
    {/* 1. 헤더 섹션 */}
    <section className="mb-10 text-center animate-fade-in-down">
      <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full font-bold text-sm mb-4">
        <Radio size={16} className="animate-pulse" />
        <span>ON AIR : 숨은명곡대전</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">
        세상이 놓친 목소리,<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
          당신의 감각으로 증명하세요.
        </span>
      </h1>
      <p className="text-gray-600 text-lg leading-relaxed break-keep">
        <strong>새로운 음악</strong>을 알아가는 재미<br/>
        나만 아는 <strong>숨은 명가수</strong>와 <strong>노래</strong>를 발굴하고 함께 듣는<br/>
        <strong>음악 큐레이션 게임</strong>입니다.
      </p>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* 2. 점수 산정 방식 (왼쪽 배치) */}
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden group hover:border-indigo-200 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Zap size={80} className="text-yellow-500" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="bg-yellow-400 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">Score</span>
          점수 계산 방식
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
            <span className="text-base font-bold text-gray-700">처음 듣는 곡</span>
            <span className="text-lg font-black text-indigo-600">+1점</span>
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
            <span className="text-base font-bold text-gray-700">노래가 좋아요</span>
            <span className="text-lg font-black text-pink-500">+1점</span>
          </div>

          {/* 4점 하이라이트 */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 rounded-xl text-white shadow-lg mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-yellow-300 text-xs tracking-widest">보너스 점수</span>
              <Star size={18} className="fill-yellow-400 text-yellow-400 animate-spin-slow" />
            </div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-base leading-tight">
                처음 듣는데<br/>노래도 좋다?
              </div>
              <div className="text-3xl font-black text-yellow-300">
                4점 <span className="text-sm font-normal opacity-80">(2배!)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 선곡 신청 가이드 (오른쪽 배치) */}
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Music2 size={24} className="text-pink-500" />
            감탄 나오는 선곡에 자신 있으신가요?<br/>
          </h3>
          
          <p className="text-gray-600 text-base mb-6 leading-relaxed">
            동네에서 <strong>주크박스</strong> 소리 좀 듣는다면<br/>
            나만의 <strong>음악 취향</strong>을 인정 받고 싶다면<br/>
            지금 바로 신청하세요!
          </p>

          <div className="bg-pink-50 border-l-4 border-pink-500 p-4 rounded-r-xl mb-6">
            <h4 className="font-bold text-pink-700 text-sm mb-2 flex items-center gap-2">
              <PenTool size={16} />
              선곡 신청 시
            </h4>
            <p className="text-gray-700 text-sm">
              <strong>추천 이유</strong>와 <strong>가수</strong>나 <strong>곡</strong>에 대한 <strong>간략한 소개</strong>와<br/>
              재미있는 <strong>비하인드 스토리</strong><br/> 그리고 곡에 얽힌 <strong>나의 이야기</strong>를 적어주세요.
            </p>
          </div>
        </div>

        {/* 버튼 */}
        <button 
          onClick={() => navigateTo('challenge')}
          className="w-full bg-black text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
        >
          <span>선곡 신청하러 가기</span>
          <ArrowRight size={20} />
        </button>
      </div>

    </div>
  </div>
);

export default GuidePage;