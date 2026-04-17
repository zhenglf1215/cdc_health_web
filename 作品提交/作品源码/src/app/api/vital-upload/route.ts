import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 计算劳动代谢率 Mi
// Mi = 65 + (HR - HRrest) / (180 - 0.65×Age - HRrest) × [(41.7 - 0.22×Age) × W^(2/3) - 65]
const calculateMi = (hr: number, age: number, weight: number, restingHr: number = 65): number => {
  const W_2_3 = Math.pow(weight, 2 / 3);
  const denominator = 180 - 0.65 * age - restingHr;
  if (denominator === 0) return 65;
  
  const base = (hr - restingHr) / denominator;
  const metabolicTerm = (41.7 - 0.22 * age) * W_2_3 - 65;
  const mi = 65 + base * metabolicTerm;
  
  return Math.max(0, Math.min(600, mi));
};

// 递推计算核心体温 Tre(Tcr)
// Tcr(t+1) = Tcr(t) + 0.0036 × (Mi - 55) × 0.0952
const calculateTcr = (mi: number, previousTcr: number = 36.8): number => {
  const deltaTcr = 0.0036 * (mi - 55) * 0.0952;
  const newTcr = previousTcr + deltaTcr;
  return Math.max(35, Math.min(40, newTcr));
};

// 计算年龄
const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

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

    // 获取用户信息（用于计算 Mi 和 Tre）
    let userAge = 25; // 默认年龄
    let userWeight = 70; // 默认体重
    let userRestingHr = 65; // 默认静息心率
    let lastTcr = 36.8; // 上次 Tcr 值
    
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('birth_date, weight, resting_heart_rate, last_tcr')
      .eq('user_id', userId)
      .single();
    
    if (profileData) {
      if (profileData.birth_date) {
        userAge = calculateAge(profileData.birth_date);
      }
      if (profileData.weight) {
        userWeight = parseFloat(profileData.weight);
      }
      if (profileData.resting_heart_rate) {
        userRestingHr = parseFloat(profileData.resting_heart_rate);
      }
      if (profileData.last_tcr) {
        lastTcr = parseFloat(profileData.last_tcr);
      }
    }
    
    // 计算 Mi 和 Tre(Tcr)
    let calculatedMi = 0;
    let calculatedTcr = lastTcr;
    
    if (hr !== undefined && hr !== null) {
      calculatedMi = calculateMi(hr, userAge, userWeight, userRestingHr);
      calculatedTcr = calculateTcr(calculatedMi, lastTcr);
      
      // 更新用户的 last_tcr
      await supabase
        .from('user_profiles')
        .update({ last_tcr: calculatedTcr.toFixed(2) })
        .eq('user_id', userId);
    }
    
    const records: any[] = [];
    const recordedAt = timestamp || new Date().toISOString();
    
    // 添加 Mi 记录（劳动代谢率）
    if (calculatedMi > 0) {
      records.push({
        user_id: userId,
        data_type: 'mi',
        value: String(calculatedMi.toFixed(2)),
        recorded_at: recordedAt,
        environment_id: envData?.id || null,
        environment_name: environmentName
      });
    }
    
    // 添加 Tre(Tcr) 记录（核心体温）
    records.push({
      user_id: userId,
      data_type: 'tcr',
      value: String(calculatedTcr.toFixed(2)),
      recorded_at: recordedAt,
      environment_id: envData?.id || null,
      environment_name: environmentName
    });

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
