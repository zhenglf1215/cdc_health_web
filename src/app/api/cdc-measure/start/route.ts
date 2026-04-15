import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, environmentId, environmentName } = body;

    if (!userId || !environmentId) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 生成会话ID
    const sessionId = `cdc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建CDC测量会话
    const { data, error } = await supabase
      .from('cdc_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        environment_id: environmentId,
        environment_name: environmentName,
        start_time: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('创建CDC测量会话失败:', error);
      return NextResponse.json(
        { success: false, message: '创建测量会话失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: data.id,
      message: 'CDC测量已开始'
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
