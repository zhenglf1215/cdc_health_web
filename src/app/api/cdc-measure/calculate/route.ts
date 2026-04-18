import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 归一化函数
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

// 计算CDC
function calculateCDC(stats: { av: number; ad: number; cv: number; skew: number }[]): number {
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

// 数据类型映射：前端传入的字段名 -> 数据库字段名
const TYPE_MAP: Record<string, string> = {
  'hr': 'hr',    // 心率
  'tcr': 'tcr',  // 核心体温
  'tsk': 'tsk'   // 皮肤温度
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, environmentId, environmentName, tcr, tsk, hr } = body;

    console.log('📤 CDC计算请求:', { userId, environmentId, environmentName });

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

    const supabase = getSupabaseClient();
    const envName = environmentName || `env_${environmentId}`;

    // 构建当前上传数据的统计
    const dataMap: Record<string, number[]> = {
      tcr: Array.isArray(tcr) ? tcr.filter((v: number) => !isNaN(v)) : [],
      tsk: Array.isArray(tsk) ? tsk.filter((v: number) => !isNaN(v)) : [],
      hr: Array.isArray(hr) ? hr.filter((v: number) => !isNaN(v)) : []
    };

    const currentStats: Record<string, { av: number; ad: number; cv: number; skew: number }> = {};

    for (const [type, values] of Object.entries(dataMap)) {
      if (values.length === 0) continue;
      
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
      const sd = Math.sqrt(variance);
      const cv = (sd / avg) * 100;
      const ad = sd;
      const skew = calculateSkew(values, avg, sd);

      currentStats[type] = { av: avg, ad, cv, skew };
      const dbType = TYPE_MAP[type];

      // 保存当前数据的统计值到数据库
      const { data: existingRecord, error: selectError } = await supabase
        .from('user_environment_stats')
        .select('id')
        .eq('user_id', userId)
        .eq('environment', envName)
        .single();

      if (selectError) {
        console.error('查询记录失败:', selectError);
      }

      const insertPayload: Record<string, any> = {
        user_id: userId,
        environment: envName,
        company: environmentId,
        [`${dbType}_av`]: avg.toFixed(4),
        [`${dbType}_sd`]: sd.toFixed(4),
        [`${dbType}_cv`]: cv.toFixed(4),
        [`${dbType}_ad`]: ad.toFixed(4),
        [`${dbType}_skew`]: skew.toFixed(4),
        [`${dbType}_count`]: values.length
      };

      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('user_environment_stats')
          .update(insertPayload)
          .eq('id', existingRecord.id);
        if (updateError) console.error('更新失败:', updateError);
      } else {
        const { error: insertError } = await supabase
          .from('user_environment_stats')
          .insert(insertPayload);
        if (insertError) console.error('插入失败:', insertError);
        else console.log('插入成功:', insertPayload);
      }
    }

    // 查询该用户所有环境的已有统计数据
    const { data: allStats } = await supabase
      .from('user_environment_stats')
      .select('*')
      .eq('user_id', userId);

    // 构建 CDC 计算所需的数据（当前数据 + 历史数据）
    const cdcInputData: Record<string, { av: number; ad: number; cv: number; skew: number }[]> = {
      hr: [], tcr: [], tsk: []
    };

    // 添加当前上传数据的统计
    for (const [type, stat] of Object.entries(currentStats)) {
      cdcInputData[type].push(stat);
    }

    // 添加历史数据的统计
    if (allStats && allStats.length > 0) {
      for (const record of allStats) {
        // 跳过当前环境的数据（已经在currentStats中）
        if (record.environment === envName) continue;

        // HR数据
        if (record.hr_av && !isNaN(parseFloat(record.hr_av))) {
          cdcInputData.hr.push({
            av: parseFloat(record.hr_av),
            ad: record.hr_ad ? parseFloat(record.hr_ad) : 0,
            cv: record.hr_cv ? parseFloat(record.hr_cv) : 0,
            skew: record.hr_skew ? parseFloat(record.hr_skew) : 0
          });
        }

        // Tre数据 (核心体温)
        if (record.tcr_av && !isNaN(parseFloat(record.tcr_av))) {
          cdcInputData.tcr.push({
            av: parseFloat(record.tcr_av),
            ad: record.tcr_ad ? parseFloat(record.tcr_ad) : 0,
            cv: record.tcr_cv ? parseFloat(record.tcr_cv) : 0,
            skew: record.tcr_skew ? parseFloat(record.tcr_skew) : 0
          });
        }

        // Tsk数据 (皮肤温度)
        if (record.tsk_av && !isNaN(parseFloat(record.tsk_av))) {
          cdcInputData.tsk.push({
            av: parseFloat(record.tsk_av),
            ad: record.tsk_ad ? parseFloat(record.tsk_ad) : 0,
            cv: record.tsk_cv ? parseFloat(record.tsk_cv) : 0,
            skew: record.tsk_skew ? parseFloat(record.tsk_skew) : 0
          });
        }
      }
    }

    // 计算CDC值
    const cdcResult: Record<string, number> = {};
    for (const type of ['hr', 'tcr', 'tsk']) {
      const cdc = calculateCDC(cdcInputData[type]);
      cdcResult[type] = cdc;
    }

    console.log('✅ CDC计算完成:', { 
      cdcResult, 
      dataPoints: {
        hr: cdcInputData.hr.length,
        tcr: cdcInputData.tcr.length,
        tsk: cdcInputData.tsk.length
      }
    });

    return NextResponse.json({
      success: true,
      message: 'CDC计算完成',
      cdc: cdcResult,
      dataCount: {
        hr: cdcInputData.hr.length,
        tcr: cdcInputData.tcr.length,
        tsk: cdcInputData.tsk.length
      },
      stats: currentStats
    });

  } catch (error) {
    console.error('❌ API错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
