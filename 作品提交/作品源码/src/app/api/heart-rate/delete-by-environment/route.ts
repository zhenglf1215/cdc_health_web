import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const environmentName = searchParams.get('environmentName');
    const reason = searchParams.get('reason') || '手动删除';

    // 验证必填字段
    if (!userId || !environmentName) {
      return NextResponse.json(
        { success: false, message: '缺少必填字段' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 查找环境ID
    const { data: envData, error: envError } = await supabase
      .from('environments')
      .select('id')
      .eq('name', environmentName)
      .single();

    if (envError || !envData) {
      return NextResponse.json(
        { success: false, message: '环境不存在' },
        { status: 404 }
      );
    }

    // 删除该用户在该环境下的所有心率数据
    const { data: deletedData, error: deleteError } = await supabase
      .from('raw_samples')
      .delete()
      .eq('user_id', userId)
      .eq('environment', envData.id)
      .eq('sample_type', 'hr')
      .select();

    if (deleteError) {
      console.error('删除心率数据失败:', deleteError);
      return NextResponse.json(
        { success: false, message: '删除数据失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `成功删除 ${deletedData?.length || 0} 条心率数据`,
      deletedCount: deletedData?.length || 0,
      reason,
    });
  } catch (error) {
    console.error('删除心率数据请求失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
