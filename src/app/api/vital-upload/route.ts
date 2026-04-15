import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, company, environmentName, tcr, tsk, hr, timestamp } = body;

    console.log('📤 收到生命体征上传请求:', {
      userId,
      environmentName,
      tcr,
      tsk,
      hr,
      timestamp
    });

    // 验证必填字段
    if (!userId || !environmentName || !timestamp) {
      return NextResponse.json(
        { success: false, message: '缺少必填字段' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 查找环境ID（如果环境不存在则创建）
    let envData: any = null;
    
    // 先查找环境
    const { data: existingEnv } = await supabase
      .from('environments')
      .select('id')
      .eq('name', environmentName)
      .eq('company', company || '')
      .single();

    if (existingEnv) {
      envData = existingEnv;
    } else {
      // 创建新环境
      const { data: newEnv, error: createError } = await supabase
        .from('environments')
        .insert({
          name: environmentName,
          company: company || '',
          user_id: userId
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error('创建环境失败:', createError);
        // 继续使用通用环境ID
      } else {
        envData = newEnv;
      }
    }

    const records: any[] = [];
    const recordedAt = timestamp || new Date().toISOString();

    // 添加 Tcr 记录
    if (tcr !== undefined && tcr !== null) {
      records.push({
        user_id: userId,
        data_type: 'tcr',
        value: String(tcr),
        recorded_at: recordedAt,
        environment_id: envData?.id || null,
        environment_name: environmentName
      });
    }

    // 添加 Tsk 记录
    if (tsk !== undefined && tsk !== null) {
      records.push({
        user_id: userId,
        data_type: 'tsk',
        value: String(tsk),
        recorded_at: recordedAt,
        environment_id: envData?.id || null,
        environment_name: environmentName
      });
    }

    // 添加 HR 记录
    if (hr !== undefined && hr !== null) {
      records.push({
        user_id: userId,
        data_type: 'hr',
        value: String(hr),
        recorded_at: recordedAt,
        environment_id: envData?.id || null,
        environment_name: environmentName
      });
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有有效数据' },
        { status: 400 }
      );
    }

    // 批量插入数据
    const { data, error } = await supabase
      .from('vital_records')
      .insert(records)
      .select();

    if (error) {
      console.error('❌ 上传失败:', error);
      return NextResponse.json(
        { success: false, message: '上传失败', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ 成功上传 ${records.length} 条记录`);
    return NextResponse.json({
      success: true,
      message: `成功上传 ${records.length} 条记录`,
      count: records.length,
      data
    });

  } catch (err) {
    console.error('API错误:', err);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
