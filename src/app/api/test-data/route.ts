import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 获取用户的测试数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const client = getSupabaseClient();

    // 获取用户在各环境的统计数据
    const { data: statsData, error } = await client
      .from('user_environment_stats')
      .select('*')
      .eq('user_id', userId)
      .order('environment', { ascending: true });

    if (error) {
      console.error('查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stats: statsData || [],
    });
  } catch (error) {
    console.error('获取测试数据错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
