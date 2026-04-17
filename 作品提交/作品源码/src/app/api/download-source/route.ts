import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('type') || 'default';
    
    // 使用 Supabase Storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 根据类型返回不同的源文件信息
    const sourceFiles: Record<string, { name: string; description: string }> = {
      'user-avatar': { name: '用户头像模板', description: '支持的图片格式：JPG、PNG' },
      'env-image': { name: '环境图片', description: '环境监测相关图片' },
      'default': { name: '通用资源', description: '系统通用资源文件' }
    };
    
    const sourceInfo = sourceFiles[sourceType] || sourceFiles['default'];
    
    return NextResponse.json({
      success: true,
      data: {
        type: sourceType,
        ...sourceInfo,
        available: true,
        storage: 'supabase',
        message: '请使用 Supabase Storage 上传和管理文件'
      }
    });
    
  } catch (error) {
    console.error('Download source error:', error);
    return NextResponse.json(
      { success: false, error: '获取资源信息失败' },
      { status: 500 }
    );
  }
}
