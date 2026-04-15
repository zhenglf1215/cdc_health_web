'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Loader2, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { Heart, Thermometer, ThermometerSun, Activity } from 'lucide-react';
import { getCurrentUser, type UserInfo } from '@/lib/auth';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import '@/styles/cdc-animations.css';

// 计数跳动动画组件
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setIsAnimating(true);
      const startValue = prevValue.current;
      const endValue = value;
      const startTime = Date.now();
      const duration = 300;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * easeOut;
        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          prevValue.current = value;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value]);

  return (
    <span className={`inline-block ${isAnimating ? 'count-bounce' : ''}`}>
      {decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue)}
    </span>
  );
}

// 超标闪烁数值组件
function AlertValue({ value, threshold, unit, decimals = 0 }: { value: number; threshold: number; unit: string; decimals?: number }) {
  const isAlert = value >= threshold;
  
  return (
    <span className={`inline-block ${isAlert ? 'alert-flash' : ''}`}>
      <AnimatedNumber value={value} decimals={decimals} />
      <span className="text-sm ml-1">{unit}</span>
    </span>
  );
}

// 风险等级环形进度条
function RiskRing({ hr, tcr, size = 80 }: { hr?: number; tcr?: number; size?: number }) {
  const [percent, setPercent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (!hr && !tcr) {
      setPercent(0);
      return;
    }
    
    const hrRisk = hr && hr >= 180 ? 100 : 
                   hr && hr >= 160 ? 75 : 
                   hr && hr >= 140 ? 50 : 
                   hr && hr >= 120 ? 25 : 0;
    
    const tcrRisk = tcr && tcr >= 38.5 ? 100 :
                    tcr && tcr >= 38.0 ? 75 :
                    tcr && tcr >= 37.5 ? 50 :
                    tcr && tcr >= 37.0 ? 25 : 0;
    
    const maxRisk = Math.max(hrRisk, tcrRisk);
    
    setIsAnimating(true);
    const startPercent = percent;
    const startTime = Date.now();
    const duration = 600;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setPercent(startPercent + (maxRisk - startPercent) * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [hr, tcr]);

  const getLevel = () => {
    if (percent >= 100) return { label: '高危', color: '#ef4444' };
    if (percent >= 75) return { label: '高风险', color: '#f97316' };
    if (percent >= 50) return { label: '中风险', color: '#eab308' };
    return { label: '正常', color: '#22c55e' };
  };

  const level = getLevel();
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} opacity={0.3} />
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none"
            stroke={level.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={isAnimating ? offset : circumference}
            style={{ 
              transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.3s ease',
              filter: percent >= 75 ? `drop-shadow(0 0 4px ${level.color})` : 'none'
            }}
            className={percent >= 100 ? 'pulse-glow' : ''}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${percent >= 100 ? 'alert-flash' : ''}`} style={{ color: level.color }}>
            {Math.round(percent)}%
          </span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color: level.color }}>{level.label}</span>
    </div>
  );
}

interface VitalCard {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  colorBg: string;
  borderColor: string;
  description: string;
}

interface ChartData {
  time: string;
  timestamp: number;
  hr?: number;
  tsk?: number;
  mi?: number;
  tcr?: number;
}

interface TodayStats {
  hr: { current: number; avg: number; min: number; max: number; trend: 'up' | 'down' | 'stable' };
  tsk: { current: number; avg: number; min: number; max: number; trend: 'up' | 'down' | 'stable' };
  mi: { current: number; avg: number };
  tcr: { current: number; avg: number };
}

const vitalCards: VitalCard[] = [
  {
    id: 'tcr',
    title: 'Tcr',
    subtitle: '核心温度',
    icon: <Thermometer className="w-8 h-8" />,
    href: '/applicant/vitals/tcr',
    color: 'text-orange-600',
    colorBg: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: '核心体温 / Core Temperature'
  },
  {
    id: 'tsk',
    title: 'Tsk',
    subtitle: '皮肤温度',
    icon: <ThermometerSun className="w-8 h-8" />,
    href: '/applicant/vitals/tsk',
    color: 'text-teal-600',
    colorBg: 'bg-teal-50',
    borderColor: 'border-teal-200',
    description: '皮肤温度 / Skin Temperature'
  },
  {
    id: 'hr',
    title: 'HR',
    subtitle: '心率',
    icon: <Heart className="w-8 h-8" />,
    href: '/applicant/vitals/hr',
    color: 'text-red-600',
    colorBg: 'bg-red-50',
    borderColor: 'border-red-200',
    description: '心率监测 / Heart Rate'
  },
  {
    id: 'metabolic',
    title: 'M',
    subtitle: '代谢率',
    icon: <Activity className="w-8 h-8" />,
    href: '/applicant/vitals/metabolic',
    color: 'text-purple-600',
    colorBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: '代谢率 / Metabolic Rate'
  }
];

export default function VitalSignsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 计算公式
  const M0 = 65;
  const Tcr0 = 36.8;

  const calculateMi = (hr: number, age: number = 30, weight: number = 65, restingHR: number = 65): number => {
    const denominator = 180 - 0.65 * age - restingHR;
    if (denominator <= 0) return M0;
    const term1 = (hr - restingHR) / denominator;
    const term2 = (41.7 - 0.22 * age) * Math.pow(weight, 2/3) - M0;
    return Math.max(0, M0 + term1 * term2);
  };

  const calculateTcrFromMi = (miValues: number[]): number[] => {
    const efficiencyFactor = 1 - Math.exp(-0.1);
    const tcrValues: number[] = [];
    let currentTcr = Tcr0;

    for (const mi of miValues) {
      const deltaTcr = 0.0036 * (mi - 55) * efficiencyFactor;
      currentTcr = currentTcr + deltaTcr;
      tcrValues.push(Math.round(currentTcr * 100) / 100);
    }

    return tcrValues;
  };

  // 获取数据
  const fetchTodayData = async () => {
    const userData = getCurrentUser();
    if (!userData?.id) return;

    setDataLoading(true);
    try {
      // 获取所有类型的数据
      const res = await fetch(`/api/heart-rate/history?userId=${userData.id}&timeRange=today`);
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        // 按时间分组（只保留有数据的时间点）
        const groupedByTime: Record<string, ChartData> = {};
        
        // 按时间排序
        const sortedData = [...data.data].sort(
          (a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );
        
        sortedData.forEach((record: any) => {
          const timestamp = new Date(record.recorded_at).getTime();
          const time = format(new Date(record.recorded_at), 'HH:mm');
          
          if (!groupedByTime[time]) {
            groupedByTime[time] = { time, timestamp };
          }
          
          const value = parseFloat(record.value);
          if (record.data_type === 'hr') {
            groupedByTime[time].hr = value;
          } else if (record.data_type === 'tsk') {
            groupedByTime[time].tsk = value;
          }
        });

        // 转换为数组并排序
        const result: ChartData[] = Object.values(groupedByTime)
          .sort((a, b) => a.timestamp - b.timestamp);

        // 计算 Mi 和 Tcr
        let currentMi = M0;
        let currentTcr = Tcr0;
        const efficiencyFactor = 1 - Math.exp(-0.1);

        result.forEach((item, index) => {
          if (item.hr) {
            // 计算 Mi
            currentMi = calculateMi(item.hr);
            // 计算 Tcr
            const deltaTcr = 0.0036 * (currentMi - 55) * efficiencyFactor;
            currentTcr = currentTcr + deltaTcr;
            
            item.mi = Math.round(currentMi * 10) / 10;
            item.tcr = Math.round(currentTcr * 100) / 100;
          }
        });

        setChartData(result);

        // 计算统计（只统计有数据的时间点）
        const hrValues = result.filter(d => d.hr !== undefined).map(d => d.hr!);
        const tskValues = result.filter(d => d.tsk !== undefined).map(d => d.tsk!);
        const miValues = result.filter(d => d.mi !== undefined).map(d => d.mi!);
        const tcrValues = result.filter(d => d.tcr !== undefined).map(d => d.tcr!);

        const calcTrend = (arr: number[]) => {
          if (arr.length < 5) return 'stable';
          const recent = arr.slice(-3);
          const prev = arr.slice(-6, -3);
          if (recent.length === 0 || prev.length === 0) return 'stable';
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const prevAvg = prev.reduce((a, b) => a + b, 0) / prev.length;
          if (recentAvg - prevAvg > 1) return 'up';
          if (recentAvg - prevAvg < -1) return 'down';
          return 'stable';
        };

        setTodayStats({
          hr: {
            current: hrValues.length > 0 ? hrValues[hrValues.length - 1] : 0,
            avg: hrValues.length > 0 ? hrValues.reduce((a, b) => a + b, 0) / hrValues.length : 0,
            min: hrValues.length > 0 ? Math.min(...hrValues) : 0,
            max: hrValues.length > 0 ? Math.max(...hrValues) : 0,
            trend: calcTrend(hrValues)
          },
          tsk: {
            current: tskValues.length > 0 ? tskValues[tskValues.length - 1] : 0,
            avg: tskValues.length > 0 ? tskValues.reduce((a, b) => a + b, 0) / tskValues.length : 0,
            min: tskValues.length > 0 ? Math.min(...tskValues) : 0,
            max: tskValues.length > 0 ? Math.max(...tskValues) : 0,
            trend: calcTrend(tskValues)
          },
          mi: {
            current: miValues.length > 0 ? miValues[miValues.length - 1] : 0,
            avg: miValues.length > 0 ? miValues.reduce((a, b) => a + b, 0) / miValues.length : 0
          },
          tcr: {
            current: tcrValues.length > 0 ? tcrValues[tcrValues.length - 1] : 0,
            avg: tcrValues.length > 0 ? tcrValues.reduce((a, b) => a + b, 0) / tcrValues.length : 0
          }
        });
      } else {
        setChartData([]);
        setTodayStats(null);
      }
    } catch (err) {
      console.error('获取数据出错:', err);
      setError('加载数据失败');
    } finally {
      setDataLoading(false);
    }
  };

  // 手动刷新
  const handleRefresh = () => {
    fetchTodayData();
  };

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) {
      setUser(userData);
      fetchTodayData();
    }
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const userData = getCurrentUser();
      if (!userData) {
        router.push('/products');
        return;
      }
      if (userData.role !== 'applicant') {
        router.push('/admin');
        return;
      }
      setUser(userData);
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200">
      {/* 顶部导航 */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div 
            className="flex items-center justify-between h-14 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-500" />
              <h1 className="text-lg font-semibold">生命体征监测</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* 刷新按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                disabled={dataLoading}
                className="p-2 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                title="刷新数据"
              >
                <RefreshCw className={`w-5 h-5 text-blue-600 ${dataLoading ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex items-center text-gray-500">
                <span className="text-sm mr-2">{expanded ? '收起' : '展开'}</span>
                {expanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 今日数据概览卡片 */}
        {dataLoading ? (
          <Card className="bg-white/80 backdrop-blur glass-effect">
            <CardContent className="p-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 spin-smooth text-blue-600 mr-2" />
              <span className="text-gray-500">加载今日数据...</span>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-white/80 backdrop-blur glass-effect">
            <CardContent className="p-6 text-center text-red-500">
              <span className="alert-flash">{error}</span>
            </CardContent>
          </Card>
        ) : todayStats && (todayStats.hr.current > 0 || todayStats.tsk.current > 0) ? (
          <div className="grid grid-cols-4 gap-3">
            {/* HR心率 - 直接从vital_records读取 */}
            <Card className="bg-white/80 backdrop-blur border-red-200 card-hover cursor-pointer">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-red-600 flex items-center gap-1">
                  <Heart className="w-3 h-3" /> HR
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold text-red-600">
                  <AlertValue value={todayStats.hr.current} threshold={180} unit="bpm" />
                  <span className="text-xs font-normal text-gray-500 ml-1">bpm</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>均<AnimatedNumber value={todayStats.hr.avg || 0} /></span>
                  {getTrendIcon(todayStats.hr.trend)}
                </div>
              </CardContent>
            </Card>

            {/* Mi代谢率 - 计算 */}
            <Card className="bg-white/80 backdrop-blur border-purple-200 card-hover cursor-pointer">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-purple-600 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Mi
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold text-purple-600">
                  <AnimatedNumber value={todayStats.mi.current || 0} />
                  <span className="text-xs font-normal text-gray-500 ml-1">W/m²</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <span>均<AnimatedNumber value={todayStats.mi.avg || 0} /></span>
                </div>
              </CardContent>
            </Card>

            {/* Tcr核心温度 - 计算 */}
            <Card className="bg-white/80 backdrop-blur border-orange-200 card-hover cursor-pointer">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-orange-600 flex items-center gap-1">
                  <Thermometer className="w-3 h-3" /> Tcr
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold text-orange-600">
                  <AlertValue value={todayStats.tcr.current || 0} threshold={38} unit="°C" decimals={2} />
                  <span className="text-xs font-normal text-gray-500 ml-1">°C</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <span>均<AnimatedNumber value={todayStats.tcr.avg || 0} decimals={2} /></span>
                </div>
              </CardContent>
            </Card>

            {/* Tsk皮肤温度 - 直接从vital_records读取 */}
            <Card className="bg-white/80 backdrop-blur border-teal-200 card-hover cursor-pointer">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-teal-600 flex items-center gap-1">
                  <ThermometerSun className="w-3 h-3" /> Tsk
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold text-teal-600">
                  <AnimatedNumber value={todayStats.tsk.current || 0} decimals={1} />
                  <span className="text-xs font-normal text-gray-500 ml-1">°C</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <span>均<AnimatedNumber value={todayStats.tsk.avg || 0} decimals={1} /></span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-6 text-center text-gray-500">
              暂无今日数据<br />
              <span className="text-xs">开始测量后将显示数据</span>
            </CardContent>
          </Card>
        )}

        {/* 今日趋势图表 - 只显示有数据的时间点 */}
        {chartData.length > 0 && (
          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">
                今日趋势 ({format(new Date(), 'yyyy-MM-dd')})
                <span className="text-xs font-normal text-gray-400 ml-2">
                  共{chartData.length}个数据点
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[30, 45]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255,255,255,0.95)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(0,0,0,0.1)', 
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} name="心率 (bpm)" connectNulls className="wave-draw" />
                    <Line yAxisId="left" type="monotone" dataKey="tsk" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4, fill: '#14b8a6' }} name="皮肤温度 (°C)" connectNulls className="wave-draw delay-100" />
                    <Line yAxisId="left" type="monotone" dataKey="mi" stroke="#9333ea" strokeWidth={2.5} dot={{ r: 4, fill: '#9333ea' }} name="代谢率 (W/m²)" connectNulls className="wave-draw delay-200" />
                    <Line yAxisId="right" type="monotone" dataKey="tcr" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4, fill: '#f97316' }} name="核心温度 (°C)" connectNulls className="wave-draw delay-300" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 说明 */}
        {chartData.length > 0 && (
          <Card className="bg-white/60">
            <CardContent className="p-3 text-xs text-gray-500">
              <p className="font-medium text-gray-600 mb-1">数据说明</p>
              <p>• <span className="text-red-500">HR</span>、<span className="text-teal-500">Tsk</span>：直接从数据库读取</p>
              <p>• <span className="text-purple-500">Mi</span>：根据HR计算得出</p>
              <p>• <span className="text-orange-500">Tcr</span>：根据Mi累加计算得出</p>
              <p className="mt-1 text-gray-400">仅显示有数据记录的时间点</p>
            </CardContent>
          </Card>
        )}

        {/* 生命体征卡片列表 */}
        {expanded ? (
          <div className="space-y-3">
            {vitalCards.map(card => (
              <Link key={card.id} href={card.href}>
                <Card className={`${card.colorBg} ${card.borderColor} hover:shadow-md transition-all cursor-pointer border`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 bg-white/50 rounded-2xl flex items-center justify-center ${card.color}`}>
                          {card.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{card.title}</span>
                            <span className="text-sm text-gray-600">{card.subtitle}</span>
                          </div>
                          <p className="text-xs text-gray-500">{card.description}</p>
                        </div>
                      </div>
                      <ChevronDown className="w-5 h-5 text-gray-400 transform -rotate-90" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {vitalCards.map(card => (
              <Link key={card.id} href={card.href}>
                <Card className={`${card.colorBg} ${card.borderColor} hover:shadow-md transition-all cursor-pointer border`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-white/50 rounded-xl flex items-center justify-center ${card.color}`}>
                          {card.icon}
                        </div>
                        <div>
                          <span className="text-sm font-medium">{card.subtitle}</span>
                          <span className="text-xs text-gray-500 ml-2">{card.title}</span>
                        </div>
                      </div>
                      <ChevronDown className="w-5 h-5 text-gray-400 transform -rotate-90" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
