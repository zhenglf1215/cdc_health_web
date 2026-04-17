'use client';

import { useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';

export default function Home() {
  useEffect(() => {
    // 使用统一的认证工具检查用户
    const user = getCurrentUser();
    
    if (!user) {
      // 未登录，跳转到产品展示页面
      window.location.href = '/products';
      return;
    }
    
    // 根据角色跳转到对应页面
    if (user.role === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/applicant';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white">正在跳转...</p>
      </div>
    </div>
  );
}
