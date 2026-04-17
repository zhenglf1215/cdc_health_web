import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 计算基本统计量
function calculateStats(samples: number[]) {
  const n = samples.length;
  if (n === 0) return null;

  // AV: 平均值
  const av = samples.reduce((sum, x) => sum + x, 0) / n;

  // AD: 均差（Mean Absolute Deviation）
  const ad = samples.reduce((sum, x) => sum + Math.abs(x - av), 0) / n;

  // SD: 标准差
  const sd = Math.sqrt(samples.reduce((sum, x) => sum + Math.pow(x - av, 2), 0) / (n - 1));

  // CV: 变异系数（Coefficient of Variation）
  const cv = sd / av;

  // SKEW: 偏斜度
  const skew = (n / ((n - 1) * (n - 2))) * samples.reduce((sum, x) => sum + Math.pow((x - av) / sd, 3), 0);

  // MIN: 最小值
  const min = Math.min(...samples);

  // MAX: 最大值
  const max = Math.max(...samples);

  return { av, ad, sd, cv, skew, min, max, count: n };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, environmentName } = body;

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
      .select('id, name')
      .eq('name', environmentName)
      .single();

    if (envError || !envData) {
      return NextResponse.json(
        { success: false, message: '环境不存在' },
        { status: 404 }
      );
    }

    // 查询该用户在该环境下的所有心率数据
    const { data: samples, error: samplesError } = await supabase
      .from('raw_samples')
      .select('sample_data, sample_count')
      .eq('user_id', userId)
      .eq('environment', envData.id)
      .eq('sample_type', 'hr')
      .single();

    if (samplesError || !samples || !samples.sample_data || samples.sample_data.length === 0) {
      return NextResponse.json(
        { success: false, message: '未找到心率数据' },
        { status: 404 }
      );
    }

    // 计算统计值
    const stats = calculateStats(samples.sample_data);

    if (!stats) {
      return NextResponse.json(
        { success: false, message: '计算统计值失败' },
        { status: 500 }
      );
    }

    // 查询用户公司信息
    const { data: userData } = await supabase
      .from('users')
      .select('company')
      .eq('id', userId)
      .single();

    // 保存或更新统计量
    const { data: existingStats } = await supabase
      .from('user_environment_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('environment', envData.id)
      .single();

    const statsData = {
      user_id: userId,
      environment: envData.id,
      company: userData?.company || '',
      hr_av: stats.av,
      hr_ad: stats.ad,
      hr_sd: stats.sd,
      hr_cv: stats.cv,
      hr_skew: stats.skew,
      hr_count: stats.count,
      hr_min: stats.min,
      hr_max: stats.max,
    };

    let result;
    if (existingStats) {
      // 更新现有记录
      result = await supabase
        .from('user_environment_stats')
        .update(statsData)
        .eq('user_id', userId)
        .eq('environment', envData.id);
    } else {
      // 插入新记录
      result = await supabase
        .from('user_environment_stats')
        .insert(statsData);
    }

    if (result.error) {
      console.error('保存统计值失败:', result.error);
      return NextResponse.json(
        { success: false, message: '保存统计值失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '统计值计算成功',
      stats: {
        av: stats.av.toFixed(2),
        ad: stats.ad.toFixed(2),
        cv: stats.cv.toFixed(4),
        skew: stats.skew.toFixed(4),
        min: stats.min,
        max: stats.max,
        count: stats.count,
      },
      environment: envData.name,
    });
  } catch (error) {
    console.error('计算统计值请求失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
