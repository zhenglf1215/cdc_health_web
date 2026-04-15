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

type TimeFilter = 'day' | 'week' | 'month';
type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export default function TskPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
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
      loadData(user.id, timeFilter === 'day' ? selectedDay : 0);
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

  const getDayLabel = (daysAgo: number): string => {
    if (daysAgo === 0) return '今天';
    if (daysAgo === 1) return '昨天';
    if (daysAgo === 2) return '前天';
    return `${daysAgo}天前`;
  };

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

  const loadData = async (userId: string, daysAgo: number = 0) => {
    setDataLoading(true);
    try {
      const dateStr = getDateString(daysAgo);
      const res = await fetch(`/api/heart-rate/history?userId=${userId}&timeRange=date:${dateStr}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        const tskRecords = data.data
          .filter((r: { data_type: string }) => r.data_type === 'tsk')
          .sort((a: { recorded_at: string }, b: { recorded_at: string }) => 
            new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
          );
        
        const chartPoints = tskRecords.map((record: { recorded_at: string; value: string }) => ({
          time: new Date(record.recorded_at).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          date: new Date(record.recorded_at).toISOString().split('T')[0],
          value: parseFloat(record.value)
        }));
        
        setChartData(chartPoints);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  };

  const handleDaySelect = (index: DayIndex) => {
    setSelectedDay(index);
    setDayExpanded(false);
    if (user) {
      loadData(user.id, index);
    }
  };

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

  // 加载指定日期范围的数据
  const loadDataForRange = async (userId: string, days: number) => {
    setDataLoading(true);
    try {
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
        // 过滤TSK数据并按时间排序
        const tskRecords = allRecords
          .filter((r) => r.data_type === 'tsk')
          .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
        
        if (tskRecords.length > 0) {
          // 按天聚合数据 - 取每天的平均值
          const dailyData: { [key: string]: number[] } = {};
          tskRecords.forEach((record) => {
            const dateKey = new Date(record.recorded_at).toISOString().split('T')[0];
            if (!dailyData[dateKey]) {
              dailyData[dateKey] = [];
            }
            dailyData[dateKey].push(parseFloat(record.value));
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
        } else {
          setChartData([]);
        }
      } else {
        setChartData([]);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      setChartData([]);
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-2xl">🌡️</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">皮肤温度</h1>
            <p className="text-sm text-gray-500">Tsk (Skin Temperature)</p>
          </div>
        </div>
        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          disabled={dataLoading}
          className="p-2 rounded-full hover:bg-green-100 transition-colors disabled:opacity-50"
          title="刷新数据"
        >
          <RefreshCw className={`w-5 h-5 text-green-600 ${dataLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 时间筛选和日期选择 */}
      <Card className="bg-white border-green-200">
        <CardContent className="p-4">
          {/* 时间筛选选项卡 */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={timeFilter === 'day' ? 'default' : 'outline'}
              onClick={() => handleTimeFilterChange('day')}
              className={`flex-1 ${timeFilter === 'day' ? 'bg-green-500 hover:bg-green-600' : ''}`}
            >
              <Calendar className="w-4 h-4 mr-1" />
              日
            </Button>
            <Button
              variant={timeFilter === 'week' ? 'default' : 'outline'}
              onClick={() => handleTimeFilterChange('week')}
              className={`flex-1 ${timeFilter === 'week' ? 'bg-green-500 hover:bg-green-600' : ''}`}
            >
              周
            </Button>
            <Button
              variant={timeFilter === 'month' ? 'default' : 'outline'}
              onClick={() => handleTimeFilterChange('month')}
              className={`flex-1 ${timeFilter === 'month' ? 'bg-green-500 hover:bg-green-600' : ''}`}
            >
              月
            </Button>
          </div>

          {/* 日选项卡 - 可展开的日期列表 */}
          {timeFilter === 'day' && (
            <div className="space-y-2">
              {/* 当前选中日期 */}
              <div
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => setDayExpanded(!dayExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-600" />
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
                          ? 'bg-green-100 border border-green-300'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => handleDaySelect(index as DayIndex)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${selectedDay === index ? 'text-green-600' : 'text-gray-700'}`}>
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
                显示选定时间段内的皮肤温度变化
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
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
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
                    domain={[30, 38]}
                    tickLine={false}
                    tickFormatter={(value) => `${value}°C`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}°C`, '皮肤温度']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <span className="text-lg">暂无数据</span>
              <span className="text-sm mt-1">请先在首页测量皮肤温度</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 健康提示 */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-green-800 mb-2">💡 健康科普</h3>
          <p className="text-sm text-green-700">
            皮肤温度受环境影响较大，通常在26-33°C之间。高温环境下皮肤血管扩张会导致皮肤温度升高，
            而低温环境下血管收缩会使皮肤温度降低。与核心温度结合分析可以更好地评估热应激状态。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
