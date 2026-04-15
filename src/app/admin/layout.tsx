'use client';

import { useState, useEffect } from 'react';
import { Loader2, Settings } from 'lucide-react';
import { AdminSidebar } from '@/components/admin-sidebar';
import { GlobalAlertBanner } from '@/components/admin/global-alert';
import { getCurrentUser, type UserInfo } from '@/lib/auth';
import '@/styles/cdc-animations.css';

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const userData = getCurrentUser();
      
      if (!userData) {
        window.location.href = '/products';
        return;
      }
      
      if (userData.role !== 'admin') {
        window.location.href = '/applicant';
        return;
      }
      
      setUser(userData);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200 flex flex-col items-center justify-center">
        {/* Apple风格Loading */}
        <div className="w-20 h-20 mb-6 relative">
          {/* 外圈 */}
          <div className="absolute inset-0 rounded-full border-[3px] border-white/20"></div>
          {/* 渐变旋转圈 */}
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-white animate-spin" style={{ animationDuration: '1s' }}></div>
          {/* 渐变旋转圈2 */}
          <div className="absolute inset-[6px] rounded-full border-[2px] border-transparent border-r-white/60 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}></div>
          {/* 中心图标 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Settings className="w-8 h-8 text-white/80" />
          </div>
        </div>
        
        {/* 文字 */}
        <p className="text-white/90 text-lg font-medium tracking-wide animate-pulse">正在加载管理面板...</p>
        
        {/* 底部进度点 */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200">
      <AdminSidebar />
      
      {/* 主内容区 */}
      <main className="lg:ml-64 min-h-screen p-4 md:p-6">
        {/* 全局报警横幅 */}
        <GlobalAlertBanner />
        {children}
      </main>
    </div>
  );
}
