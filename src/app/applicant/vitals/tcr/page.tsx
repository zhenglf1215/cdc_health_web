'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser, type UserInfo } from '@/lib/auth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ChevronDown, ChevronUp, Calendar, Check, X, RefreshCw } from 'lucide-react';

interface ChartDataPoint {
  time: string;
  value: number;
  date: string;
}

interface DayData {
  date: string;
  label: string;
  hasData: boolean;
  count: number;
}

interface UserProfile {
  birth_date?: string;
  weight?: number;
  resting_hr?: number;
}

type TimeFilter = 'day' | 'week' | 'month';
type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export default function TcrPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [dayExpanded, setDayExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayIndex>(0);
  const [dayDataList, setDayDataList] = useState<DayData[]>([]);

  // 手动刷新
  const handleRefresh = () => {
    if (user) {
      if (timeFilter === 'day') {
        loadData(user.id, selectedDay);
      } else {
        const days = timeFilter === 'week' ? 7 : 30;
        loadDataForRange(user.id, days);
      }
      loadDayDataList(user.id);
    }
  };

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData && userData.role === 'applicant') {
      setUser(userData);
      loadData(userData.id, 0);
      loadDayDataList(userData.id);
    } else {
      setLoading(false);
    }
  }, []);

  // 计算年龄
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // 计算劳动代谢率 Mi
  const calculateMi = (hr: number, age: number, weight: number, restingHr: number = 65): number => {
    // Mi = 65 + (HR - HRrest) / (180 - 0.65×Age - HRrest) × [(41.7 - 0.22×Age) × W^(2/3) - 65]
    const W_2_3 = Math.pow(weight, 2/3);
    const denominator = 180 - 0.65 * age - restingHr;
    if (denominator === 0) return 65;
    
    const base = (hr - restingHr) / denominator;
    const metabolicTerm = (41.7 - 0.22 * age) * W_2_3 - 65;
    const mi = 65 + base * metabolicTerm;
    
    return Math.max(0, Math.min(600, mi));
  };

  // 计算核心温度 Tcr（基于Mi递推）
  const calculateTcr = (miValues: number[], initialTcr: number = 36.8): number[] => {
    const tcrValues: number[] = [initialTcr];
    
    for (let i = 1; i < miValues.length; i++) {
      // Tcr(t+1) = Tcr(t) + 0.0036 × (Mi - 55) × 0.0952
      const deltaTcr = 0.0036 * (miValues[i - 1] - 55) * 0.0952;
      const newTcr = tcrValues[i - 1] + deltaTcr;
      // 限制体温范围在35-40°C
      tcrValues.push(Math.max(35, Math.min(40, newTcr)));
    }
    
    return tcrValues;
  };

  // 获取日期标签
  const getDayLabel = (daysAgo: number): string => {
    if (daysAgo === 0) return '今天';
    if (daysAgo === 1) return '昨天';
    if (daysAgo === 2) return '前天';
    return `${daysAgo}天前`;
  };

  // 加载日期列表（检查每天是否有数据）
  const loadDayDataList = async (userId: string) => {
    const days: DayData[] = [];
    const now = new Date();
    // 转为北京时间
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + beijingOffset);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(beijingNow);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      try {
        const res = await fetch(`/api/heart-rate/history?userId=${userId}&timeRange=date:${dateStr}`);
        const data = await res.json();
        const tskRecords = data.data?.filter((r: { data_type: string }) => r.data_type === 'tsk') || [];
        days.push({
          date: dateStr,
          label: getDayLabel(i),
          hasData: tskRecords.length > 0,
          count: tskRecords.length
        });
      } catch {
        days.push({
          date: dateStr,
          label: getDayLabel(i),
          hasData: false,
          count: 0
        });
      }
    }
    
    setDayDataList(days);
  };

  // 获取指定日期的数据
  // 获取北京时间的日期字符串 YYYY-MM-DD
  const getDateString = (daysAgo: number): string => {
    const now = new Date();
    // 转为北京时间
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + beijingOffset);
    beijingDate.setDate(beijingDate.getDate() - daysAgo);
    
    const year = beijingDate.getFullYear();
    const month = String(beijingDate.getMonth() + 1).padStart(2, '0');
    const day = String(beijingDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 获取指定日期范围的数据
  const loadDataForRange = async (userId: string, days: number) => {
    setDataLoading(true);
    try {
      // 获取用户profile
      const profileRes = await fetch(`/api/profile?user_id=${userId}`);
      let userProfile: UserProfile = { resting_hr: 65 };
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.data) {
          userProfile = profileData.data;
          setProfile(userProfile);
        }
      }

      // 获取所有日期的数据
      const allRecords: { recorded_at: string; value: string; data_type: string }[] = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const res = await fetch(`/api/heart-rate/history?userId=${userId}&timeRange=date:${dateStr}`);
          const data = await res.json();
          if (data.data) {
            allRecords.push(...data.data);
          }
        } catch {
          // 忽略单日错误
        }
      }

      if (allRecords.length > 0) {
        // 过滤HR数据并按时间排序
        const hrRecords = allRecords
          .filter((r) => r.data_type === 'hr')
          .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
        
        if (hrRecords.length > 0) {
          const age = userProfile.birth_date ? calculateAge(userProfile.birth_date) : 30;
          const weight = userProfile.weight || 65;
          const restingHr = userProfile.resting_hr || 65;
          
          // 计算Mi值数组
          const miValues = hrRecords.map((record) => {
            const hr = parseFloat(record.value);
            return calculateMi(hr, age, weight, restingHr);
          });
          
          // 计算Tcr值数组
          const tcrValues = calculateTcr(miValues);
          
          // 按天聚合数据 - 取每天的平均值
          const dailyData: { [key: string]: number[] } = {};
          hrRecords.forEach((record, index) => {
            const dateKey = new Date(record.recorded_at).toISOString().split('T')[0];
            if (!dailyData[dateKey]) {
              dailyData[dateKey] = [];
            }
            dailyData[dateKey].push(tcrValues[index]);
          });
          
          // 构建图表数据 - 显示每天的平均值
          const chartPoints = Object.entries(dailyData)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([date, values]) => ({
              time: new Date(date).toLocaleDateString('zh-CN', { 
                month: 'short', 
                day: 'numeric' 
              }),
              date: date,
              value: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
            }));
          
          setChartData(chartPoints);
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  };

  const loadData = async (userId: string, daysAgo: number = 0) => {
    setDataLoading(true);
    try {
      // 获取用户profile
      const profileRes = await fetch(`/api/profile?user_id=${userId}`);
      let userProfile: UserProfile = { resting_hr: 65 };
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.data) {
          userProfile = profileData.data;
          setProfile(userProfile);
        }
      }

      const dateStr = getDateString(daysAgo);
      const res = await fetch(`/api/heart-rate/history?userId=${userId}&timeRange=date:${dateStr}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        // 过滤HR数据并按时间排序
        const hrRecords = data.data
          .filter((r: { data_type: string }) => r.data_type === 'hr')
          .sort((a: { recorded_at: string }, b: { recorded_at: string }) => 
            new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
          );
        
        if (hrRecords.length > 0) {
          // 获取用户参数
          const age = userProfile.birth_date ? calculateAge(userProfile.birth_date) : 30;
          const weight = userProfile.weight || 65;
          const restingHr = userProfile.resting_hr || 65;
          
          // 计算Mi值数组
          const miValues = hrRecords.map((record: { value: string }) => {
            const hr = parseFloat(record.value);
            return calculateMi(hr, age, weight, restingHr);
          });
          
          // 计算Tcr值数组（基于Mi递推）
          const tcrValues = calculateTcr(miValues);
          
          // 构建图表数据
          const chartPoints = hrRecords.map((record: { recorded_at: string }, index: number) => ({
            time: new Date(record.recorded_at).toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            date: new Date(record.recorded_at).toISOString().split('T')[0],
            value: Math.round(tcrValues[index] * 100) / 100
          }));
          
          setChartData(chartPoints);
        } else {
          setChartData([]);
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  };

  // 处理日期选择
  const handleDaySelect = (index: DayIndex) => {
    setSelectedDay(index);
    setDayExpanded(false);
    if (user) {
      loadData(user.id, index);
    }
  };

  // 处理时间筛选切换
  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    if (filter === 'day') {
      setDayExpanded(false);
      if (user) {
        loadData(user.id, selectedDay);
      }
    } else if (user) {
      // 周: 7天, 月: 30天
      const days = filter === 'week' ? 7 : 30;
      loadDataForRange(user.id, days);
    }
  };

  const formatValue = (val?: number) => {
    if (val === undefined || val === null || isNaN(val as number)) return '--';
    return (val as number).toFixed(2);
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const age = profile?.birth_date ? calculateAge(profile.birth_date) : '--';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-2xl">🌡️</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">核心温度</h1>
            <p className="text-sm text-gray-500">Tcr (Core Temperature)</p>
          </div>
        </div>
        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          disabled={dataLoading}
          className="p-2 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
          title="刷新数据"
        >
          <RefreshCw className={`w-5 h-5 text-blue-600 ${dataLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 参数展示 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">年龄</p>
              <p className="text-xl font-bold text-blue-600">{age}岁</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">体重</p>
              <p className="text-xl font-bold text-blue-600">{profile?.weight || '--'}kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">静息心率</p>
              <p className="text-xl font-bold text-blue-600">{profile?.resting_hr || '--'} bpm</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 时间筛选和日期选择 */}
      <Card className="bg-white border-blue-200">
        <CardContent className="p-4">
          {/* 时间筛选选项卡 */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={timeFilter === 'day' ? 'default' : 'outline'}
              onClick={() => handleTimeFilterChange('day')}
              className={`flex-1 ${timeFilter === 'day' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
            >
              <Calendar className="w-4 h-4 mr-1" />
              日
            </Button>
            <Button
              variant={timeFilter === 'week' ? 'default' : 'outline'}
              onClick={() => handleTimeFilterChange('week')}
              className={`flex-1 ${timeFilter === 'week' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
            >
              周
            </Button>
            <Button
              variant={timeFilter === 'month' ? 'default' : 'outline'}
              onClick={() => handleTimeFilterChange('month')}
              className={`flex-1 ${timeFilter === 'month' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
            >
              月
            </Button>
          </div>

          {/* 日选项卡 - 可展开的日期列表 */}
          {timeFilter === 'day' && (
            <div className="space-y-2">
              {/* 当前选中日期 */}
              <div
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => setDayExpanded(!dayExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {dayDataList[selectedDay]?.label || '今天'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateLabel(dayDataList[selectedDay]?.date || '')}
                      {dayDataList[selectedDay]?.hasData
                        ? ` · ${dayDataList[selectedDay]?.count} 条数据`
                        : ' · 暂无数据'}
                    </p>
                  </div>
                </div>
                {dayExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* 展开的日期列表 */}
              {dayExpanded && (
                <div className="space-y-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {dayDataList.map((day, index) => (
                    <div
                      key={day.date}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedDay === index
                          ? 'bg-blue-100 border border-blue-300'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => handleDaySelect(index as DayIndex)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${selectedDay === index ? 'text-blue-600' : 'text-gray-700'}`}>
                          {day.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDateLabel(day.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {day.hasData ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Check className="w-4 h-4" />
                            <span className="text-xs">{day.count}条</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <X className="w-4 h-4" />
                            <span className="text-xs">暂无数据</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 周/月提示 */}
          {timeFilter !== 'day' && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">
                {timeFilter === 'week' ? '本周' : '本月'}数据趋势
              </p>
              <p className="text-xs text-gray-400 mt-1">
                显示选定时间段内的核心温度变化
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 图表 */}
      <Card>
        <CardContent className="p-4">
          {dataLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    domain={[35, 38]}
                    tickLine={false}
                    tickFormatter={(value) => `${value}°C`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}°C`, '核心温度']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <span className="text-lg">暂无数据</span>
              <span className="text-sm mt-1">请先在首页测量心率</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 健康提示 */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-800 mb-2">💡 健康科普</h3>
          <p className="text-sm text-blue-700">
            核心体温正常范围为36.5°C-37.5°C。剧烈运动后体温可能升高0.5-2°C，
            通常在休息后恢复正常。持续高热或体温异常时请及时就医。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
