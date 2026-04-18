import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface VitalData {
  type: 'tcr' | 'tsk' | 'hr';
  value: number;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, environmentId, environmentName, data } = body as {
      userId: string;
      environmentId: string;
      environmentName: string;
      data: VitalData[];
    };

    if (!userId || !environmentId || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 将数据插入 vital_records 表（持续记录）
    const records = data.map((item) => ({
      user_id: userId,
      environment_id: environmentId,
      environment_name: environmentName,
      data_type: item.type,
      value: item.value,
      recorded_at: new Date(item.timestamp).toISOString()
    }));

    const { error } = await supabase
      .from('vital_records')
      .insert(records);

    if (error) {
      console.error('存储生命体征数据失败:', error);
      return NextResponse.json(
        { success: false, message: '存储数据失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '生命体征数据已记录',
      count: records.length
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
