import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // 获取用户统计信息
    const { data: users, error } = await supabase
      .from('users')
      .select('role');

    if (error) {
      console.error('Failed to fetch user stats:', error);
      return NextResponse.json(
        { error: '获取用户统计失败' },
        { status: 500 }
      );
    }

    const stats = {
      totalUsers: users?.length || 0,
      applicantCount: users?.filter((u: { role: string }) => u.role === 'applicant').length || 0,
      adminCount: users?.filter((u: { role: string }) => u.role === 'admin').length || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
