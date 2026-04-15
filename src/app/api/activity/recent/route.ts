import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const supabase = getSupabaseClient();

    // 从 cdc_sessions 表获取最近的CDC测量记录
    const { data: sessions, error: sessionsError } = await supabase
      .from('cdc_sessions')
      .select(`
        id,
        user_id,
        environment_name,
        status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionsError) {
      console.error('获取活动记录失败:', sessionsError);
      return NextResponse.json({ success: false, message: '获取失败', data: [] });
    }

    // 格式化活动数据
    const activities = (sessions || []).map((item: any) => {
      const timeAgo = getTimeAgo(new Date(item.created_at));

      // 根据状态显示不同活动类型
      let action = '完成CDC测量';
      if (item.status === 'active') {
        action = '进行CDC测量';
      }

      return {
        id: item.id,
        action,
        user: item.environment_name || 'CDC测量',
        time: timeAgo,
      };
    });

    return NextResponse.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('获取活动记录失败:', error);
    return NextResponse.json({ success: false, message: '服务异常', data: [] });
  }
}

// 计算时间差
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
}
