import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { username, password, role, company } = await request.json();

    // 验证必填字段
    if (!username || !password || !role) {
      return NextResponse.json(
        { error: '用户名、密码和角色为必填项' },
        { status: 400 }
      );
    }

    // 验证角色
    if (!['applicant', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: '角色必须是 applicant 或 admin' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 检查用户名是否已存在
    const { data: existingUser, error: checkError } = await client
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      throw new Error(`查询失败: ${checkError.message}`);
    }

    if (existingUser) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 409 }
      );
    }

    // 直接存储明文密码
    const { data, error } = await client
      .from('users')
      .insert({
        username,
        password: password,
        role,
        company: company || null,
      })
      .select('id, username, role, company, created_at')
      .single();

    if (error) {
      throw new Error(`注册失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      user: data,
      message: '注册成功',
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '注册失败' },
      { status: 500 }
    );
  }
}
