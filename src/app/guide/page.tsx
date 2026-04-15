'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, Activity, Heart, Thermometer, Zap, Shield, Database, Sparkles } from 'lucide-react';
import { getCurrentUser, type UserInfo } from '@/lib/auth';

interface GuideFeature {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface GuidePage {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  features: GuideFeature[];
  icon: React.ReactNode;
  bgGradient: string;
  accentColor: string;
}

const guidePages: GuidePage[] = [
  {
    id: 1,
    title: '个人CDC数据',
    subtitle: '您的健康数据中心',
    description: '集中管理您的核心体温、皮肤温度和心率数据，实时掌握热应激状态，为健康管理提供科学依据。',
    features: [
      { icon: <Database className="w-5 h-5" />, title: '数据统计', desc: 'AV/AD/SD/CV/SKEW 多维度分析' },
      { icon: <Activity className="w-5 h-5" />, title: 'CDC计算', desc: '综合热应激风险评估' },
      { icon: <Shield className="w-5 h-5" />, title: '风险预警', desc: '智能提醒关注健康' },
    ],
    icon: <Database className="w-16 h-16 text-white" />,
    bgGradient: 'from-blue-500 via-blue-400 to-cyan-400',
    accentColor: 'blue',
  },
  {
    id: 2,
    title: 'CDC测量',
    subtitle: '智能设备互联',
    description: '通过蓝牙连接智能穿戴设备，自动采集生理数据，支持多种数据输入方式，让测量更便捷。',
    features: [
      { icon: <Sparkles className="w-5 h-5" />, title: '蓝牙连接', desc: '自动同步设备数据' },
      { icon: <Activity className="w-5 h-5" />, title: '实时监测', desc: '每60秒自动记录' },
      { icon: <Zap className="w-5 h-5" />, title: '文件上传', desc: '支持CSV/JSON导入' },
    ],
    icon: <Sparkles className="w-16 h-16 text-white" />,
    bgGradient: 'from-purple-500 via-purple-400 to-pink-400',
    accentColor: 'purple',
  },
  {
    id: 3,
    title: '生命体征监测',
    subtitle: '全方位健康守护',
    description: '核心体温(Tcr)、皮肤温度(Tsk)、心率(HR)三大核心指标，全面监测您的生理状态变化。',
    features: [
      { icon: <Thermometer className="w-5 h-5" />, title: '核心体温 Tre', desc: '体内深部温度监测' },
      { icon: <Thermometer className="w-5 h-5" />, title: '皮肤温度 Tsk', desc: '体表温度分布' },
      { icon: <Heart className="w-5 h-5" />, title: '心率 HR', desc: '心脏跳动频率' },
    ],
    icon: <Heart className="w-16 h-16 text-white" />,
    bgGradient: 'from-rose-500 via-red-400 to-orange-400',
    accentColor: 'red',
  },
  {
    id: 4,
    title: '劳动代谢率',
    subtitle: '能量消耗分析',
    description: '根据您的生理数据实时计算劳动代谢率，科学评估运动强度和能量消耗，助力科学锻炼。',
    features: [
      { icon: <Zap className="w-5 h-5" />, title: '实时计算', desc: '根据心率动态计算' },
      { icon: <Activity className="w-5 h-5" />, title: '强度评估', desc: '运动强度分级' },
      { icon: <Shield className="w-5 h-5" />, title: '健康建议', desc: '个性化运动指导' },
    ],
    icon: <Zap className="w-16 h-16 text-white" />,
    bgGradient: 'from-emerald-500 via-green-400 to-teal-400',
    accentColor: 'green',
  },
  {
    id: 5,
    title: 'CDC系统',
    subtitle: '热应激风险评估',
    description: '基于多环境数据综合评估您的热应激风险等级，提前预警，让您在任何环境下都能安全工作。',
    features: [
      { icon: <Shield className="w-5 h-5" />, title: '风险评估', desc: '多维度综合评分' },
      { icon: <Activity className="w-5 h-5" />, title: '环境分析', desc: '多环境数据对比' },
      { icon: <Sparkles className="w-5 h-5" />, title: '智能建议', desc: '科学防护指导' },
    ],
    icon: <Shield className="w-16 h-16 text-white" />,
    bgGradient: 'from-orange-500 via-amber-400 to-yellow-400',
    accentColor: 'orange',
  },
];

export default function GuidePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) {
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const handleNext = () => {
    if (currentPage < guidePages.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleFinish = () => {
    router.push('/auth');
  };

  const handleSkip = () => {
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200 flex flex-col items-center justify-center">
        {/* Apple风格Loading */}
        <div className="w-20 h-20 mb-6 relative">
          {/* 外圈 */}
          <div className="absolute inset-0 rounded-full border-[3px] border-white/20"></div>
          {/* 渐变旋转圈 */}
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-white animate-spin" style={{ animationDuration: '1s' }}></div>
          {/* 渐变旋转圈2 */}
          <div className="absolute inset-[6px] rounded-full border-[2px] border-transparent border-r-white/60 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}></div>
        </div>
        
        {/* 文字 */}
        <p className="text-white/90 text-lg font-medium tracking-wide animate-pulse">正在加载引导...</p>
        
        {/* 底部进度点 */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const current = guidePages[currentPage];
  const isLastPage = currentPage === guidePages.length - 1;
  const progress = ((currentPage + 1) / guidePages.length) * 100;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${current.bgGradient} flex flex-col relative overflow-hidden`}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse delay-300"></div>
        <div className="absolute bottom-40 left-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        {/* 漂浮的粒子 */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-white/30 rounded-full animate-float`}
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* 顶部进度条 */}
      <div className="w-full h-1.5 bg-white/20 relative z-10">
        <div 
          className="h-full bg-white transition-all duration-500 ease-out shadow-lg shadow-white/50"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 顶部区域 */}
      <div className="w-full p-6 flex justify-between items-center relative z-10">
        <div className="text-white/80 text-sm font-medium animate-fade-in">
          {user?.username}，欢迎使用
        </div>
        <button
          onClick={handleSkip}
          className="text-white/80 hover:text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          跳过
        </button>
      </div>

      {/* 主内容区 */}
      <div className={`flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        
        {/* 主图标区域 */}
        <div className="relative mb-8">
          {/* 背景光环 */}
          <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl scale-150 animate-pulse"></div>
          {/* 图标容器 */}
          <div className="relative w-36 h-36 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-2xl animate-bounce-subtle">
            <div className="animate-spin-slow">
              {current.icon}
            </div>
          </div>
          {/* 装饰圆环 */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-sm shadow-lg animate-bounce">
            {currentPage + 1}
          </div>
        </div>

        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg animate-slide-up">
            {current.title}
          </h1>
          <p className="text-white/90 text-lg font-medium animate-slide-up delay-100">
            {current.subtitle}
          </p>
          <div className="w-20 h-1 bg-white/50 rounded-full mx-auto mt-4 animate-slide-up delay-200"></div>
        </div>

        {/* 描述文字 */}
        <p className="text-white/95 text-center max-w-lg leading-relaxed text-base mb-10 animate-slide-up delay-300">
          {current.description}
        </p>

        {/* 功能特点卡片 */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-10">
          {current.features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/15 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 hover:bg-white/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${0.4 + index * 0.1}s` }}
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2 text-white">
                {feature.icon}
              </div>
              <p className="text-white text-xs font-medium mb-1">{feature.title}</p>
              <p className="text-white/70 text-xs">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* 页面指示器 - 可点击切换 */}
        <div className="flex items-center gap-3 mt-4">
          {guidePages.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setCurrentPage(index);
                  setIsAnimating(false);
                }, 200);
              }}
              className={`relative transition-all duration-300 ${
                index === currentPage 
                  ? 'w-10 h-3 bg-white rounded-full shadow-lg shadow-white/50' 
                  : 'w-3 h-3 bg-white/40 rounded-full hover:bg-white/60 cursor-pointer'
              }`}
            >
              {index === currentPage && (
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-50"></div>
              )}
            </button>
          ))}
        </div>
        <p className="text-white/60 text-sm mt-3">
          {currentPage + 1} / {guidePages.length}
        </p>
      </div>

      {/* 底部按钮区域 */}
      <div className="w-full px-6 pb-12 relative z-10">
        <div className="flex gap-4 max-w-lg mx-auto">
          {currentPage > 0 ? (
            <Button
              onClick={handlePrev}
              variant="outline"
              className="flex-1 h-14 bg-white/15 hover:bg-white/25 border-2 border-white/40 text-white rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              上一步
            </Button>
          ) : (
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1 h-14 bg-white/15 hover:bg-white/25 border-2 border-white/40 text-white rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
            >
              跳过
            </Button>
          )}

          {isLastPage ? (
            <Button
              onClick={handleFinish}
              className="flex-1 h-14 bg-white text-blue-600 hover:bg-white/90 rounded-2xl font-bold shadow-xl shadow-white/30 transition-all duration-300 hover:scale-105 active:scale-95 animate-pulse-glow"
            >
              开始使用
              <Check className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex-1 h-14 bg-white text-blue-600 hover:bg-white/90 rounded-2xl font-semibold shadow-lg shadow-white/30 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              下一步
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* 底部装饰 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/10 to-transparent"></div>
    </div>
  );
}
