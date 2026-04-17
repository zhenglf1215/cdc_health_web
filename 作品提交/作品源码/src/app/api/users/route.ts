import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: 获取用户列表（管理员可查看所有用户）
export async function GET(request: NextRequest) {
  try {
    // 从 URL 参数或 Cookie 获取用户信息
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('user_role');
    
    // 如果没有URL参数，尝试从Cookie获取
    let role = userRole;
    let uid = userId;
    
    if (!role || !uid) {
      const cookieStore = await cookies();
      role = role || cookieStore.get('user_role')?.value || null;
      uid = uid || cookieStore.get('user_id')?.value || null;
    }

    // 管理员模式：查看所有用户
    if (role === 'admin') {
      const client = getSupabaseClient();
      
      // 获取所有用户
      const { data: users, error } = await client
        .from('users')
        .select('id, username, role, company, created_at, last_login')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('查询用户失败:', error);
        return NextResponse.json({ error: '查询失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, users: users || [], data: users || [] });
    }

    // 普通用户模式：需要登录
    if (!uid) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const client = getSupabaseClient();

    // 获取用户的企业
    const { data: currentUser, error: userError } = await client
      .from('users')
      .select('company')
      .eq('id', uid)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 获取同企业的所有用户
    const { data: users, error } = await client
      .from('users')
      .select('id, username, role, company, created_at, last_login')
      .eq('company', currentUser.company)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, users: users || [], data: users || [] });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
