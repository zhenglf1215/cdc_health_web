import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 简单的内存缓存
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 30000; // 30秒缓存

function getCached(key: string): any | null {
  const item = cache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const environmentName = searchParams.get('environmentName');
    const timeRange = searchParams.get('timeRange') || 'today';
    const type = searchParams.get('type'); // 可选：hr, tcr, tsk

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '缺少userId参数' },
        { status: 400 }
      );
    }

    // 构建缓存key
    const cacheKey = `${userId}-${type || 'all'}-${timeRange}-${environmentName || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const supabase = getSupabaseClient();

    // 计算时间范围 - 使用北京时间(UTC+8)
    const now = new Date();
    // 转为北京时间
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + beijingOffset);
    
    let startTime = new Date(beijingNow);
    let endTime = new Date(beijingNow);

    // 支持日期选择格式 date:2024-01-01
    if (timeRange.startsWith('date:')) {
      const dateStr = timeRange.substring(5);
      startTime = new Date(dateStr + 'T00:00:00+08:00');
      endTime = new Date(dateStr + 'T23:59:59.999+08:00');
    } else {
      switch (timeRange) {
        case 'today':
          startTime = new Date(beijingNow.getFullYear(), beijingNow.getMonth(), beijingNow.getDate(), 0, 0, 0, 0);
          endTime = new Date(beijingNow.getFullYear(), beijingNow.getMonth(), beijingNow.getDate(), 23, 59, 59, 999);
          break;
        case 'week':
          startTime = new Date(beijingNow);
          startTime.setDate(beijingNow.getDate() - 7);
          startTime.setHours(0, 0, 0, 0);
          endTime = new Date(beijingNow);
          break;
        case 'month':
          startTime = new Date(beijingNow);
          startTime.setMonth(beijingNow.getMonth() - 1);
          startTime.setHours(0, 0, 0, 0);
          endTime = new Date(beijingNow);
          break;
        default:
          startTime = new Date(beijingNow.getFullYear(), beijingNow.getMonth(), beijingNow.getDate(), 0, 0, 0, 0);
          endTime = new Date(beijingNow.getFullYear(), beijingNow.getMonth(), beijingNow.getDate(), 23, 59, 59, 999);
      }
    }

    // 构建查询
    let query = supabase
      .from('vital_records')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', startTime.toISOString())
      .lte('recorded_at', endTime.toISOString())
      .order('recorded_at', { ascending: true })
      .limit(500); // 限制数据量

    if (type) {
      query = query.eq('data_type', type);
    }

    if (environmentName) {
      query = query.eq('environment_name', environmentName);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('查询数据失败:', error);
      return NextResponse.json(
        { success: false, message: '查询失败', error: error.message },
        { status: 500 }
      );
    }

    // 计算统计数据
    const hrRecords = (records || []).filter((r: any) => r.data_type === 'hr');
    const tcrRecords = (records || []).filter((r: any) => r.data_type === 'tcr');
    const tskRecords = (records || []).filter((r: any) => r.data_type === 'tsk');

    const calculateStats = (recs: any[]) => {
      if (recs.length === 0) return null;
      const values = recs.map((r: any) => parseFloat(r.value));
      const sum = values.reduce((a: number, b: number) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      return { count: values.length, avg, min, max };
    };

    // 返回所有数据（让前端计算 Mi 和 Tcr）
    const result = {
      success: true,
      data: records || [],
      stats: {
        hr: calculateStats(hrRecords),
        tcr: calculateStats(tcrRecords),
        tsk: calculateStats(tskRecords),
      },
      count: records?.length || 0,
      timeRange,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };

    setCache(cacheKey, result);
    return NextResponse.json(result);

  } catch (err) {
    console.error('API错误:', err);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
