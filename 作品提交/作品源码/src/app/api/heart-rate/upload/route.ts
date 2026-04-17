import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, company, environmentName, heartRate, timestamp } = body;

    // 详细记录请求信息（便于调试）
    console.log('📤 收到心率上传请求:', {
      userId,
      company,
      environmentName,
      heartRate,
      timestamp,
      hasUserId: !!userId,
      hasEnvironmentName: !!environmentName,
      hasHeartRate: heartRate !== undefined,
      hasTimestamp: !!timestamp
    });

    // 验证必填字段
    if (!userId || !environmentName || !heartRate || !timestamp) {
      console.error('❌ 缺少必填字段:', {
        userId: !!userId,
        environmentName: !!environmentName,
        heartRate: heartRate !== undefined,
        timestamp: !!timestamp
      });
      return NextResponse.json(
        {
          success: false,
          message: '缺少必填字段',
          details: {
            hasUserId: !!userId,
            hasEnvironmentName: !!environmentName,
            hasHeartRate: heartRate !== undefined,
            hasTimestamp: !!timestamp
          }
        },
        { status: 400 }
      );
    }

    // 验证心率值范围
    if (typeof heartRate !== 'number' || heartRate < 30 || heartRate > 220) {
      console.error('❌ 心率值无效:', heartRate);
      return NextResponse.json(
        { success: false, message: `心率值无效: ${heartRate}（范围: 30-220）` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 查找环境ID（同时匹配名称和企业）
    console.log(`🔍 查找环境: name="${environmentName}", company="${company || ''}"`);
    const { data: envData, error: envError } = await supabase
      .from('environments')
      .select('id')
      .eq('name', environmentName)
      .eq('company', company || '')
      .single();

    if (envError) {
      console.error('❌ 查找环境失败:', envError);
      return NextResponse.json(
        {
          success: false,
          message: '环境查找失败',
          details: envError.message
        },
        { status: 500 }
      );
    }

    if (!envData) {
      console.error('❌ 环境不存在:', { environmentName, company: company || '' });
      // 列出所有可用环境帮助调试
      const { data: allEnvs } = await supabase
        .from('environments')
        .select('name, company')
        .eq('company', company || '');
      console.log('📋 可用环境列表:', allEnvs?.map(e => `${e.name}`));

      return NextResponse.json(
        {
          success: false,
          message: '环境不存在',
          details: {
            requested: { environmentName, company: company || '' },
            available: allEnvs?.map(e => ({ name: e.name, company: e.company }))
          }
        },
        { status: 404 }
      );
    }

    console.log(`✅ 找到环境ID: ${envData.id}`);

    // 存储心率数据到 raw_samples 表
    const { error: insertError } = await supabase
      .from('raw_samples')
      .insert({
        user_id: userId,
        environment: envData.id,
        sample_type: 'hr', // 心率类型
        sample_data: [heartRate], // 单个心率值作为数组
        sample_count: 1,
      });

    if (insertError) {
      console.error('❌ 存储心率数据失败:', insertError);
      return NextResponse.json(
        {
          success: false,
          message: '存储数据失败',
          details: insertError.message
        },
        { status: 500 }
      );
    }

    console.log('✅ 心率数据上传成功:', { heartRate, userId, environmentId: envData.id });

    return NextResponse.json({
      success: true,
      message: '心率数据上传成功'
    });
  } catch (error) {
    console.error('❌ 处理心率数据失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '服务器错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
