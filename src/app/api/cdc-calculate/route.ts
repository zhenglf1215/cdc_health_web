import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface StatsRow {
  user_id: string;
  environment: string;
  av: number;
  ad: number;
  cv: number;
  skew: number;
}

// 归一化函数
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

// 计算CDC
function calculateCDC(data: StatsRow[]): number {
  if (data.length < 2) return 0; // 至少需要2个数据点才能归一化

  const m = data.length; // 数据点数量
  const n = 3; // 维度数 (AD, CV, SKEW)

  // 获取所有AV值用于计算权重
  const avValues = data.map(d => d.av);
  const sumAV = avValues.reduce((a, b) => a + b, 0);

  // 获取AD, CV, SKEW的min和max用于归一化
  const adValues = data.map(d => d.ad);
  const cvValues = data.map(d => d.cv);
  const skewValues = data.map(d => d.skew);

  const adMin = Math.min(...adValues);
  const adMax = Math.max(...adValues);
  const cvMin = Math.min(...cvValues);
  const cvMax = Math.max(...cvValues);
  const skewMin = Math.min(...skewValues);
  const skewMax = Math.max(...skewValues);

  // 计算每个数据点的MI
  const miList = data.map(d => {
    // DML(M) = m * Wi / ΣWi
    const dmlM = (m * d.av) / sumAV;

    // 归一化
    const norAD = normalize(d.ad, adMin, adMax);
    const norCV = normalize(d.cv, cvMin, cvMax);
    const norSkew = normalize(d.skew, skewMin, skewMax);

    // DML(R²) = Nor(AD)² + Nor(CV)² + Nor(SKEW)²
    const dmlR2 = Math.pow(norAD, 2) + Math.pow(norCV, 2) + Math.pow(norSkew, 2);

    // MI = DML(M) × DML(R²)
    return dmlM * dmlR2;
  });

  // CDC = ΣMI / n
  const cdc = miList.reduce((a, b) => a + b, 0) / n;

  return cdc;
}

// 获取用户CDC
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const perspective = searchParams.get('perspective') || 'user'; // 'user' 或 'environment'
    const environment = searchParams.get('environment');

    const client = getSupabaseClient();

    if (perspective === 'user' && userId) {
      // 应用者视角：计算用户的CDC
      // 获取用户所有环境的统计数据
      const { data: stats, error } = await client
        .from('user_environment_stats')
        .select('*')
        .eq('user_id', userId);

      if (error || !stats || stats.length < 2) {
        return NextResponse.json({
          success: true,
          cdc: { hr: 0, tcr: 0, tsk: 0 },
          message: stats && stats.length < 2 ? '至少需要2个环境的数据才能计算CDC' : null
        });
      }

      // 分别计算hr, tre, tsk的CDC
      const cdcResult: { hr: number; tcr: number; tsk: number } = { hr: 0, tcr: 0, tsk: 0 };

      // HR CDC
      const hrData: StatsRow[] = stats
        .filter(s => s.hr_av !== null)
        .map(s => ({
          user_id: s.user_id,
          environment: s.environment,
          av: parseFloat(s.hr_av),
          ad: parseFloat(s.hr_ad),
          cv: parseFloat(s.hr_cv),
          skew: parseFloat(s.hr_skew),
        }));
      if (hrData.length >= 2) {
        cdcResult.hr = calculateCDC(hrData);
      }

      // TCR CDC
      const tcrData: StatsRow[] = stats
        .filter(s => s.tcr_av !== null)
        .map(s => ({
          user_id: s.user_id,
          environment: s.environment,
          av: parseFloat(s.tcr_av),
          ad: parseFloat(s.tcr_ad),
          cv: parseFloat(s.tcr_cv),
          skew: parseFloat(s.tcr_skew),
        }));
      if (tcrData.length >= 2) {
        cdcResult.tcr = calculateCDC(tcrData);
      }

      // TSK CDC
      const tskData: StatsRow[] = stats
        .filter(s => s.tsk_av !== null)
        .map(s => ({
          user_id: s.user_id,
          environment: s.environment,
          av: parseFloat(s.tsk_av),
          ad: parseFloat(s.tsk_ad),
          cv: parseFloat(s.tsk_cv),
          skew: parseFloat(s.tsk_skew),
        }));
      if (tskData.length >= 2) {
        cdcResult.tsk = calculateCDC(tskData);
      }

      return NextResponse.json({
        success: true,
        cdc: cdcResult,
        environmentCount: stats.length,
      });
    } 
    else if (perspective === 'environment') {
      // 管理者视角：计算环境的CDC
      if (!environment) {
        // 返回所有环境的CDC
        const { data: allStats, error } = await client
          .from('user_environment_stats')
          .select('*');

        if (error || !allStats) {
          return NextResponse.json({ error: '查询失败' }, { status: 500 });
        }

        // 按环境分组
        const envMap = new Map<string, typeof allStats>();
        allStats.forEach(stat => {
          const env = stat.environment;
          if (!envMap.has(env)) {
            envMap.set(env, []);
          }
          envMap.get(env)!.push(stat);
        });

        // 获取所有用户信息用于显示参与者姓名
        const { data: usersData } = await client
          .from('users')
          .select('id, username');

        const userMap = new Map<string, string>();
        usersData?.forEach(u => userMap.set(u.id, u.username));

        // 计算每个环境的CDC
        const results: { environment: string; cdc_hr: number; cdc_tcr: number; cdc_tsk: number; participant_count: number; participants: string[] }[] = [];

        envMap.forEach((stats, env) => {
          // 获取参与者姓名列表
          const participants = stats
            .map(s => userMap.get(s.user_id) || '未知用户')
            .sort();

          const result = {
            environment: env,
            cdc_hr: 0,
            cdc_tcr: 0,
            cdc_tsk: 0,
            participant_count: stats.length,
            participants,
          };

          // HR CDC
          const hrData: StatsRow[] = stats
            .filter(s => s.hr_av !== null)
            .map(s => ({
              user_id: s.user_id,
              environment: s.environment,
              av: parseFloat(s.hr_av),
              ad: parseFloat(s.hr_ad),
              cv: parseFloat(s.hr_cv),
              skew: parseFloat(s.hr_skew),
            }));
          if (hrData.length >= 2) {
            result.cdc_hr = calculateCDC(hrData);
          }

          // TCR CDC
          const tcrData: StatsRow[] = stats
            .filter(s => s.tcr_av !== null)
            .map(s => ({
              user_id: s.user_id,
              environment: s.environment,
              av: parseFloat(s.tcr_av),
              ad: parseFloat(s.tcr_ad),
              cv: parseFloat(s.tcr_cv),
              skew: parseFloat(s.tcr_skew),
            }));
          if (tcrData.length >= 2) {
            result.cdc_tcr = calculateCDC(tcrData);
          }

          // TSK CDC
          const tskData: StatsRow[] = stats
            .filter(s => s.tsk_av !== null)
            .map(s => ({
              user_id: s.user_id,
              environment: s.environment,
              av: parseFloat(s.tsk_av),
              ad: parseFloat(s.tsk_ad),
              cv: parseFloat(s.tsk_cv),
              skew: parseFloat(s.tsk_skew),
            }));
          if (tskData.length >= 2) {
            result.cdc_tsk = calculateCDC(tskData);
          }

          results.push(result);
        });

        // 按环境名排序
        results.sort((a, b) => a.environment.localeCompare(b.environment));

        return NextResponse.json({
          success: true,
          environments: results,
        });
      } else {
        // 计算指定环境的CDC
        const { data: stats, error } = await client
          .from('user_environment_stats')
          .select('*')
          .eq('environment', environment);

        if (error || !stats || stats.length < 2) {
          return NextResponse.json({
            success: true,
            cdc: { hr: 0, tcr: 0, tsk: 0 },
            participant_count: stats?.length || 0,
            message: stats && stats.length < 2 ? '至少需要2个参与者的数据才能计算CDC' : null
          });
        }

        const cdcResult = { hr: 0, tcr: 0, tsk: 0 };

        // HR CDC
        const hrData: StatsRow[] = stats
          .filter(s => s.hr_av !== null)
          .map(s => ({
            user_id: s.user_id,
            environment: s.environment,
            av: parseFloat(s.hr_av),
            ad: parseFloat(s.hr_ad),
            cv: parseFloat(s.hr_cv),
            skew: parseFloat(s.hr_skew),
          }));
        if (hrData.length >= 2) {
          cdcResult.hr = calculateCDC(hrData);
        }

        // TCR CDC
        const tcrData: StatsRow[] = stats
          .filter(s => s.tcr_av !== null)
          .map(s => ({
            user_id: s.user_id,
            environment: s.environment,
            av: parseFloat(s.tcr_av),
            ad: parseFloat(s.tcr_ad),
            cv: parseFloat(s.tcr_cv),
            skew: parseFloat(s.tcr_skew),
          }));
        if (tcrData.length >= 2) {
          cdcResult.tcr = calculateCDC(tcrData);
        }

        // TSK CDC
        const tskData: StatsRow[] = stats
          .filter(s => s.tsk_av !== null)
          .map(s => ({
            user_id: s.user_id,
            environment: s.environment,
            av: parseFloat(s.tsk_av),
            ad: parseFloat(s.tsk_ad),
            cv: parseFloat(s.tsk_cv),
            skew: parseFloat(s.tsk_skew),
          }));
        if (tskData.length >= 2) {
          cdcResult.tsk = calculateCDC(tskData);
        }

        return NextResponse.json({
          success: true,
          cdc: cdcResult,
          participant_count: stats.length,
        });
      }
    }

    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  } catch (error) {
    console.error('CDC计算错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
