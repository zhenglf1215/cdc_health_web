import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取所有环境
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('environments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取环境列表失败:', error);
      return NextResponse.json({ success: false, message: '获取失败' });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('获取环境列表失败:', error);
    return NextResponse.json({ success: false, message: '服务异常' });
  }
}

// 新增环境
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const { name, description, latitude, longitude, address } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: '环境名称不能为空' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('environments')
      .insert({
        name,
        description: description || null,
        latitude: latitude || null,
        longitude: longitude || null,
        address: address || null,
      })
      .select()
      .single();

    if (error) {
      console.error('创建环境失败:', error);
      return NextResponse.json({ success: false, message: '创建失败' });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('创建环境失败:', error);
    return NextResponse.json({ success: false, message: '服务异常' });
  }
}
