import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '缺少user_id参数' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: '用户profile不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        weight: data.weight,
        birth_date: data.birth_date,
        resting_hr: data.resting_hr,
        height: data.height,
        gender: data.gender
      }
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
