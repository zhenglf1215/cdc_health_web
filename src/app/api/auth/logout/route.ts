import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: '登出成功',
    });

    // 清除所有认证相关的 Cookie
    response.cookies.delete('user_id');
    response.cookies.delete('user_role');
    response.cookies.delete('username');

    return response;
  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '登出失败' },
      { status: 500 }
    );
  }
}
