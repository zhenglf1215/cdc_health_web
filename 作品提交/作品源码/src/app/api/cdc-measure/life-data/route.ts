import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const dataType = searchParams.get('dataType'); // tre, tsk, hr (可选)
    const environmentId = searchParams.get('environmentId'); // 可选
    const timeRange = searchParams.get('timeRange') || 'week'; // day, week, month, halfyear, year

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '缺少用户ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 计算时间范围
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'halfyear':
        startTime = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // 从 vital_records 表查询持续记录的数据
    let query = supabase
      .from('vital_records')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', startTime.toISOString())
      .order('recorded_at', { ascending: true });

    if (dataType) {
      query = query.eq('data_type', dataType);
    }

    if (environmentId) {
      query = query.eq('environment_id', environmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取生命体征数据失败:', error);
      return NextResponse.json(
        { success: false, message: '获取数据失败' },
        { status: 500 }
      );
    }

    // 按数据类型分组并计算统计
    const stats: Record<string, { count: number; avg: number; min: number; max: number; values: number[] }> = {};
    
    data?.forEach((item) => {
      const type = item.data_type;
      if (!stats[type]) {
        stats[type] = { count: 0, avg: 0, min: Infinity, max: -Infinity, values: [] };
      }
      const value = parseFloat(item.value);
      stats[type].count++;
      stats[type].values.push(value);
      stats[type].min = Math.min(stats[type].min, value);
      stats[type].max = Math.max(stats[type].max, value);
    });

    // 计算平均值
    for (const type in stats) {
      const s = stats[type];
      s.avg = s.values.reduce((a, b) => a + b, 0) / s.values.length;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      stats: stats,
      timeRange: timeRange,
      count: data?.length || 0
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
