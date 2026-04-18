import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 计算偏度
function calculateSkew(values: number[], avg: number, sd: number): number {
  if (sd === 0 || values.length < 2) return 0;
  const n = values.length;
  const sum = values.reduce((acc, val) => acc + Math.pow((val - avg) / sd, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

// 计算单类型CDC
function calculateSingleCDC(stats: { av: number; ad: number; cv: number; skew: number }[]): number {
  if (!stats || stats.length === 0) return 0;
  
  const avgAv = stats.reduce((acc, s) => acc + s.av, 0) / stats.length;
  const avgAd = stats.reduce((acc, s) => acc + s.ad, 0) / stats.length;
  const avgCv = stats.reduce((acc, s) => acc + s.cv, 0) / stats.length;
  
  if (avgAv === 0) return 0;
  return (avgAd / avgAv + avgCv / 100) / 2;
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
    const updateData: Record<string, string | number> = {};
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

      updateData[`${type}_avg`] = avg.toFixed(2);
      updateData[`${type}_sd`] = sd.toFixed(2);
      updateData[`${type}_cv`] = cv.toFixed(2);
      updateData[`${type}_count`] = values.length;

      cdcInputData[type as 'hr' | 'tcr' | 'tsk'].push({ av: avg, ad, cv, skew });
    }

    // 计算CDC值
    const cdcResult: Record<string, number> = {};
    for (const type of ['hr', 'tcr', 'tsk'] as const) {
      cdcResult[type] = calculateSingleCDC(cdcInputData[type]);
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

    for (const [type, value] of Object.entries(updateData)) {
      if (type.includes('_avg')) {
        const dataType = type.replace('_avg', '');
        
        const { data: existingRecord } = await supabase
          .from('user_environment_stats')
          .select('id')
          .eq('user_id', userId)
          .eq('environment', envName)
          .single();

        const updatePayload: Record<string, any> = {
          [`${dataType}_av`]: value,
          [`${dataType}_sd`]: updateData[`${dataType}_sd`],
          [`${dataType}_cv`]: updateData[`${dataType}_cv`],
          updated_at: new Date().toISOString()
        };

        // 如果有profile信息，也保存
        if (profile) {
          updatePayload.birth_date = profile.birth_date;
          updatePayload.weight = profile.weight;
          updatePayload.resting_hr = profile.resting_hr;
        }

        if (existingRecord) {
          await supabase
            .from('user_environment_stats')
            .update(updatePayload)
            .eq('id', existingRecord.id);
        } else {
          await supabase
            .from('user_environment_stats')
            .insert({
              user_id: userId,
              environment: envName,
              environment_id: environmentId,
              ...updatePayload
            });
        }
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
