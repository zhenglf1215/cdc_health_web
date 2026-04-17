'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ApplicantSidebar } from '@/components/applicant-sidebar';
import { getCurrentUser, type UserInfo } from '@/lib/auth';
import '@/styles/cdc-animations.css';

interface ApplicantLayoutProps {
  children: React.ReactNode;
}

export default function ApplicantLayout({ children }: ApplicantLayoutProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const userData = getCurrentUser();
      
      if (!userData) {
        window.location.href = '/products';
        return;
      }
      
      if (userData.role !== 'applicant') {
        window.location.href = '/admin';
        return;
      }
      
      // 设置用户数据
      setUser(userData);
      
      // 加载头像 - 优先从localStorage获取
      let avatarUrl = '';
      
      // 1. 优先从localStorage获取（用户刚设置的emoji头像）
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.avatar_url) {
            avatarUrl = parsed.avatar_url;
          }
        } catch {
          // ignore parse error
        }
      }
      
      // 2. 从API获取头像
      try {
        const response = await fetch(`/api/profile?user_id=${userData.id}`);
        const result = await response.json();
        if (result.success && result.data?.avatar_url) {
          avatarUrl = result.data.avatar_url;
        }
      } catch (error) {
        console.error('加载头像失败:', error);
      }
      
      // 处理相对路径
      if (avatarUrl && !avatarUrl.startsWith('data:') && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('/')) {
        avatarUrl = '/' + avatarUrl;
      }
      
      setUserAvatar(avatarUrl);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200">
      <ApplicantSidebar user={user} userAvatar={userAvatar} />
      
      {/* 主内容区 */}
      <main className="md:ml-64 min-h-screen p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
