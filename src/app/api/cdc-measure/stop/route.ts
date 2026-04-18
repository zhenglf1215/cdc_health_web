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
    const { sessionId, endTime } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: '缺少会话ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 获取CDC测量会话信息
    const { data: sessionData, error: sessionError } = await supabase
      .from('cdc_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { success: false, message: 'CDC测量会话不存在' },
        { status: 404 }
      );
    }

    // 更新会话状态
    await supabase
      .from('cdc_sessions')
      .update({
        end_time: new Date(endTime || Date.now()).toISOString(),
        status: 'completed'
      })
      .eq('id', sessionId);

    // 获取该CDC测量期间的生命体征数据（根据会话的起始时间查询）
    const sessionEndTime = new Date(endTime || Date.now()).toISOString();
    const { data: sessionRecords, error: recordsError } = await supabase
      .from('vital_records')
      .select('data_type, value, environment_id, environment_name, recorded_at')
      .eq('environment_id', sessionData.environment_id)
      .eq('user_id', sessionData.user_id)
      .gte('recorded_at', sessionData.start_time)
      .lte('recorded_at', sessionEndTime)
      .order('recorded_at', { ascending: true });

    if (recordsError || !sessionRecords || sessionRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'CDC测量已结束，但无数据',
        cdc: { hr: 0, tcr: 0, tsk: 0 }
      });
    }

    // 按数据类型分组计算统计
    const groupedStats: Record<string, { values: number[]; environment_id: string; environment_name: string; data_type: string }> = {};
    
    sessionRecords.forEach((item) => {
      // 不需要映射，统一使用 tcr
      const key = item.data_type;
      if (!groupedStats[key]) {
        groupedStats[key] = {
          values: [],
          environment_id: item.environment_id,
          environment_name: item.environment_name,
          data_type: key
        };
      }
      groupedStats[key].values.push(parseFloat(item.value));
    });

    // 计算每个数据类型的统计数据
    const updateData: Record<string, string | number> = {};
    const cdcInputData: Record<'hr' | 'tcr' | 'tsk', { av: number; ad: number; cv: number; skew: number }[]> = {
      hr: [], tcr: [], tsk: []
    };

    for (const key in groupedStats) {
      const group = groupedStats[key];
      const values = group.values;
      const dataType = key as 'hr' | 'tcr' | 'tsk';

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
      const sd = Math.sqrt(variance);
      const cv = (sd / avg) * 100;
      const ad = sd;
      const skew = calculateSkew(values, avg, sd);

      updateData[`${dataType}_avg`] = avg.toFixed(2);
      updateData[`${dataType}_sd`] = sd.toFixed(2);
      updateData[`${dataType}_cv`] = cv.toFixed(2);
      updateData[`${dataType}_count`] = values.length;

      cdcInputData[dataType].push({ av: avg, ad, cv, skew });
    }

    // 更新cdc_sessions表的统计数据
    await supabase
      .from('cdc_sessions')
      .update(updateData)
      .eq('id', sessionId);

    // 计算CDC值
    const cdcResult: Record<string, number> = {};
    for (const type of ['hr', 'tcr', 'tsk'] as const) {
      cdcResult[type] = calculateSingleCDC(cdcInputData[type]);
    }

    // 同步到 user_environment_stats 表（用于CDC计算）
    const envName = sessionData.environment_name;
    
    for (const [type, value] of Object.entries(updateData)) {
      if (type.includes('_avg')) {
        const dataType = type.replace('_avg', '');
        
        const { data: existingRecord } = await supabase
          .from('user_environment_stats')
          .select('id')
          .eq('user_id', sessionData.user_id)
          .eq('environment', envName)
          .single();

        if (existingRecord) {
          await supabase
            .from('user_environment_stats')
            .update({
              [`${dataType}_av`]: value,
              [`${dataType}_sd`]: updateData[`${dataType}_sd`],
              [`${dataType}_cv`]: updateData[`${dataType}_cv`],
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id);
        } else {
          await supabase
            .from('user_environment_stats')
            .insert({
              user_id: sessionData.user_id,
              environment: envName,
              environment_id: sessionData.environment_id,
              [`${dataType}_av`]: value,
              [`${dataType}_sd`]: updateData[`${dataType}_sd`],
              [`${dataType}_cv`]: updateData[`${dataType}_cv`],
              updated_at: new Date().toISOString()
            });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'CDC测量已结束，数据已参与CDC计算',
      cdc: cdcResult,
      stats: updateData
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
