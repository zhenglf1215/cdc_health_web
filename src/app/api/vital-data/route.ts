import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'tcr'; // tcr, tsk, hr
    const timeRange = searchParams.get('timeRange') || 'week';

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '缺少userId参数' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 计算时间范围
    const now = new Date();
    let startTime = new Date(now);
    let endTime = new Date(now);

    // 支持 date:YYYY-MM-DD 格式
    if (timeRange.startsWith('date:')) {
      const dateStr = timeRange.replace('date:', '');
      startTime = new Date(dateStr + 'T00:00:00');
      endTime = new Date(dateStr + 'T23:59:59');
    } else {
      switch (timeRange) {
        case 'today':
          startTime.setHours(0, 0, 0, 0);
          endTime.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startTime.setDate(now.getDate() - 7);
          startTime.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startTime.setMonth(now.getMonth() - 1);
          startTime.setHours(0, 0, 0, 0);
          break;
        default:
          startTime.setDate(now.getDate() - 7);
          startTime.setHours(0, 0, 0, 0);
      }
    }

    // 查询vital_records表
    let query = supabase
      .from('vital_records')
      .select('*')
      .eq('user_id', userId)
      .eq('data_type', type)
      .gte('recorded_at', startTime.toISOString());

    if (timeRange.startsWith('date:')) {
      query = query.lte('recorded_at', endTime.toISOString());
    }

    const { data: records, error } = await query.order('recorded_at', { ascending: true });

    if (error) {
      console.error(`查询${type}数据失败:`, error);
      return NextResponse.json(
        { success: false, message: '查询数据失败' },
        { status: 500 }
      );
    }

    // 处理数据 - 适配VitalSection组件期望的格式
    const vitalData = records?.map((record: {
      value: string | number;
      recorded_at: string;
    }) => ({
      timestamp: record.recorded_at,
      value: typeof record.value === 'string' ? parseFloat(record.value) : record.value,
      [type]: typeof record.value === 'string' ? parseFloat(record.value) : record.value,
    })) || [];

    // 计算统计
    let stats = { avg: 0, max: 0, min: 0 };

    if (records && records.length > 0) {
      const values = records.map((r: { value: string | number }) => 
        typeof r.value === 'string' ? parseFloat(r.value) : r.value
      );
      const sum = values.reduce((a, b) => a + b, 0);
      stats = {
        avg: sum / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
      };
    }

    return NextResponse.json({
      success: true,
      data: vitalData,
      stats,
    });
  } catch (error) {
    console.error('处理vital-data请求失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
