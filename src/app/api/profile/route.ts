import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取用户资料
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({ success: false, message: '缺少用户ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('获取用户资料失败:', error);
      return NextResponse.json({ success: false, message: '获取用户资料失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || null
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 创建或更新用户资料
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      email,
      phone,
      birth_date,
      gender,
      height,
      weight,
      blood_type,
      medical_history,
      allergies,
      exercise_frequency,
      sleep_hours,
      smoking_status,
      drinking_status,
      emergency_contact_name,
      emergency_contact_phone,
      avatar_url
    } = body;

    if (!user_id) {
      return NextResponse.json({ success: false, message: '缺少用户ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 计算 BMI
    let bmi = null;
    if (height && weight && height > 0) {
      bmi = Number((weight / Math.pow(height / 100, 2)).toFixed(2));
    }

    // 检查是否已存在资料
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user_id)
      .single();

    let result;
    if (existing) {
      // 更新现有资料
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (birth_date !== undefined) updateData.birth_date = birth_date;
      if (gender !== undefined) updateData.gender = gender;
      if (height !== undefined) updateData.height = height;
      if (weight !== undefined) updateData.weight = weight;
      if (bmi !== null) updateData.bmi = bmi;
      if (blood_type !== undefined) updateData.blood_type = blood_type;
      if (medical_history !== undefined) updateData.medical_history = medical_history;
      if (allergies !== undefined) updateData.allergies = allergies;
      if (exercise_frequency !== undefined) updateData.exercise_frequency = exercise_frequency;
      if (sleep_hours !== undefined) updateData.sleep_hours = sleep_hours;
      if (smoking_status !== undefined) updateData.smoking_status = smoking_status;
      if (drinking_status !== undefined) updateData.drinking_status = drinking_status;
      if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name;
      if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

      result = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', user_id)
        .select()
        .single();
    } else {
      // 创建新资料
      const insertData = {
        user_id,
        email,
        phone,
        birth_date,
        gender,
        height,
        weight,
        bmi,
        blood_type,
        medical_history,
        allergies,
        exercise_frequency,
        sleep_hours,
        smoking_status,
        drinking_status,
        emergency_contact_name,
        emergency_contact_phone,
        avatar_url
      };

      result = await supabase
        .from('user_profiles')
        .insert(insertData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('保存用户资料失败:', result.error);
      return NextResponse.json({ success: false, message: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: '保存成功'
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
