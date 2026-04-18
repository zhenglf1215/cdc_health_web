import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 归一化函数
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

// 计算单维度CDC
function calculateSingleCDC(stats: { av: number; ad: number; cv: number; skew: number }[]): number {
  if (stats.length < 2) return 0;

  const m = stats.length;
  const n = 3; // AD, CV, SKEW

  const sumAV = stats.reduce((a, s) => a + s.av, 0);
  if (sumAV === 0) return 0;

  const adValues = stats.map(s => s.ad);
  const cvValues = stats.map(s => s.cv);
  const skewValues = stats.map(s => s.skew);

  const adMin = Math.min(...adValues);
  const adMax = Math.max(...adValues);
  const cvMin = Math.min(...cvValues);
  const cvMax = Math.max(...cvValues);
  const skewMin = Math.min(...skewValues);
  const skewMax = Math.max(...skewValues);

  const miList = stats.map(s => {
    const dmlM = (m * s.av) / sumAV;
    const norAD = normalize(s.ad, adMin, adMax);
    const norCV = normalize(s.cv, cvMin, cvMax);
    const norSkew = normalize(s.skew, skewMin, skewMax);
    const dmlR2 = Math.pow(norAD, 2) + Math.pow(norCV, 2) + Math.pow(norSkew, 2);
    return dmlM * dmlR2;
  });

  return miList.reduce((a, b) => a + b, 0) / n;
}

// 计算SKEW（偏度）
function calculateSkew(values: number[], avg: number, sd: number): number {
  if (sd === 0 || values.length < 2) return 0;
  const n = values.length;
  const sum = values.reduce((acc, val) => acc + Math.pow((val - avg) / sd, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, environmentId, environmentName, tcr, tsk, hr } = body;

    console.log('📤 CDC直接计算请求:', { userId, environmentId, environmentName, tcr, tsk, hr });

    if (!userId || !environmentId) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证数据
    if ((!tcr || tcr.length === 0) && (!tsk || tsk.length === 0) && (!hr || hr.length === 0)) {
      return NextResponse.json(
        { success: false, message: '缺少数据' },
        { status: 400 }
      );
    }

    // 构建数据映射
    const dataMap: Record<string, number[]> = {
      tcr: Array.isArray(tcr) ? tcr.filter((v: number) => !isNaN(v)) : [],
      tsk: Array.isArray(tsk) ? tsk.filter((v: number) => !isNaN(v)) : [],
      hr: Array.isArray(hr) ? hr.filter((v: number) => !isNaN(v)) : []
    };

    // 计算每个类型的统计数据
    const updateData: Record<string, any> = {};
    const cdcInputData: Record<'hr' | 'tcr' | 'tsk', { av: number; ad: number; cv: number; skew: number }[]> = {
      hr: [], tcr: [], tsk: []
    };

    for (const [type, values] of Object.entries(dataMap)) {
      if (values.length === 0) continue;
      
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
      const sd = Math.sqrt(variance);
      const cv = (sd / avg) * 100;
      const ad = sd;
      const skew = calculateSkew(values, avg, sd);

      updateData[`${type}_avg`] = avg.toFixed(4);
      updateData[`${type}_sd`] = sd.toFixed(4);
      updateData[`${type}_cv`] = cv.toFixed(4);
      updateData[`${type}_ad`] = ad.toFixed(4);
      updateData[`${type}_skew`] = skew.toFixed(4);
      updateData[`${type}_count`] = values.length;

      cdcInputData[type as 'hr' | 'tcr' | 'tsk'].push({ av: avg, ad, cv, skew });
    }

    // 计算CDC值
    const cdcResult: Record<string, number> = {};
    for (const type of ['hr', 'tcr', 'tsk'] as const) {
      const cdc = calculateSingleCDC(cdcInputData[type]);
      cdcResult[type] = cdc;
      updateData[`${type}_cdc`] = cdc.toFixed(4);
    }

    // 保存到 user_environment_stats 表
    const supabase = getSupabaseClient();
    const envName = environmentName || `env_${environmentId}`;

    // 获取用户信息
    const { data: profile } = await supabase
      .from('profiles')
      .select('birth_date, weight, resting_hr')
      .eq('id', userId)
      .single();

    // 保存每种数据类型
    for (const type of ['hr', 'tcr', 'tsk'] as const) {
      if (cdcInputData[type].length === 0) continue;
      
      const { data: existingRecord } = await supabase
        .from('user_environment_stats')
        .select('id')
        .eq('user_id', userId)
        .eq('environment', envName)
        .single();

      const insertPayload: Record<string, any> = {
        user_id: userId,
        environment: envName,
        environment_id: environmentId,
        [`${type}_av`]: updateData[`${type}_avg`],
        [`${type}_sd`]: updateData[`${type}_sd`],
        [`${type}_cv`]: updateData[`${type}_cv`],
        [`${type}_ad`]: updateData[`${type}_ad`],
        [`${type}_skew`]: updateData[`${type}_skew`],
        [`${type}_count`]: updateData[`${type}_count`],
        [`${type}_cdc`]: updateData[`${type}_cdc`],
        updated_at: new Date().toISOString()
      };

      // 如果有profile信息，也保存
      if (profile) {
        insertPayload.birth_date = profile.birth_date;
        insertPayload.weight = profile.weight;
        insertPayload.resting_hr = profile.resting_hr;
      }

      if (existingRecord) {
        await supabase
          .from('user_environment_stats')
          .update(insertPayload)
          .eq('id', existingRecord.id);
      } else {
        await supabase
          .from('user_environment_stats')
          .insert(insertPayload);
      }
    }

    console.log('✅ CDC计算完成:', cdcResult);

    return NextResponse.json({
      success: true,
      message: 'CDC计算完成',
      cdc: cdcResult,
      stats: updateData
    });

  } catch (error) {
    console.error('❌ API错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
