'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ArrowLeft, User } from 'lucide-react';
import { getCurrentUser, logout, type UserInfo } from '@/lib/auth';

interface UserProfile {
  id: string;
  username: string;
  company: string;
  role: string;
  avatar_url?: string;
  birth_date?: string;
  weight?: number;
  resting_hr?: number;
}

// 预设头像 - 苹果Memoji风格emoji组合
const avatarPresets = [
  { id: '1', emoji: '😀', name: '开心' },
  { id: '2', emoji: '😎', name: '酷' },
  { id: '3', emoji: '🤓', name: '学霸' },
  { id: '4', emoji: '😋', name: '吃货' },
  { id: '5', emoji: '🤗', name: '热情' },
  { id: '6', emoji: '🙂', name: '微笑' },
  { id: '7', emoji: '😌', name: '放松' },
  { id: '8', emoji: '🤠', name: '牛仔' },
  { id: '9', emoji: '🧑‍💼', name: '职场' },
  { id: '10', emoji: '👨‍🔬', name: '科学家' },
  { id: '11', emoji: '👨‍💻', name: '程序员' },
  { id: '12', emoji: '👩‍🎨', name: '艺术家' },
  { id: '13', emoji: '🧑‍🏫', name: '老师' },
  { id: '14', emoji: '👨‍⚕️', name: '医生' },
  { id: '15', emoji: '🧑‍✈️', name: '飞行员' },
  { id: '16', emoji: '🦸', name: '英雄' },
  { id: '17', emoji: '🧙', name: '魔法师' },
  { id: '18', emoji: '🦊', name: '狐狸' },
  { id: '19', emoji: '🐱', name: '猫咪' },
  { id: '20', emoji: '🐶', name: '狗狗' },
  { id: '21', emoji: '🐰', name: '兔子' },
  { id: '22', emoji: '🦁', name: '狮子' },
  { id: '23', emoji: '🐼', name: '熊猫' },
  { id: '24', emoji: '🌟', name: '星星' },
  { id: '25', emoji: '🎯', name: '目标' },
  { id: '26', emoji: '🔥', name: '火焰' },
  { id: '27', emoji: '💎', name: '钻石' },
  { id: '28', emoji: '🚀', name: '火箭' },
  { id: '29', emoji: '⚡', name: '闪电' },
  { id: '30', emoji: '🌈', name: '彩虹' },
  { id: '31', emoji: '🌸', name: '樱花' },
  { id: '32', emoji: '🍀', name: '幸运' },
];

// 背景颜色
const bgColors = [
  { from: '#60A5FA', to: '#2563EB' }, // 蓝色
  { from: '#A78BFA', to: '#7C3AED' }, // 紫色
  { from: '#F472B6', to: '#DB2777' }, // 粉色
  { from: '#4ADE80', to: '#16A34A' }, // 绿色
  { from: '#FB923C', to: '#EA580C' }, // 橙色
  { from: '#F87171', to: '#DC2626' }, // 红色
  { from: '#22D3EE', to: '#0891B2' }, // 青色
  { from: '#FACC15', to: '#CA8A04' }, // 黄色
];

const getGradientColors = (id: string) => {
  const index = parseInt(id) % bgColors.length;
  return bgColors[index];
};

export default function AvatarSelectPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getCurrentUser();
    if (!userData) {
      router.push('/products');
      return;
    }
    setUser(userData);
    
    // 加载用户profile
    fetch(`/api/profile?user_id=${userData.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setProfile(data.data);
          if (data.data.avatar_url) {
            setSelectedAvatar(data.data.avatar_url);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const generateAvatarUrl = (preset: typeof avatarPresets[0]) => {
    const colors = getGradientColors(preset.id);
    return `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.from}"/>
            <stop offset="100%" style="stop-color:${colors.to}"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#bg)"/>
        <text x="50" y="65" font-size="45" text-anchor="middle" fill="white">${preset.emoji}</text>
      </svg>`
    )}`;
  };

  const handleSelect = (preset: typeof avatarPresets[0]) => {
    const url = generateAvatarUrl(preset);
    setSelectedAvatar(url);
  };

  const handleSave = async () => {
    if (!selectedAvatar || !user) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          avatar_url: selectedAvatar
        })
      });
      
      if (res.ok) {
        // 更新本地存储的头像
        const updatedUser = { ...user, avatar_url: selectedAvatar };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        router.push(user.role === 'admin' ? '/admin' : '/applicant');
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (user?.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/applicant');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
          <h1 className="text-lg font-semibold text-gray-900">选择头像</h1>
          <div className="w-16"></div>
        </div>
      </header>

      {/* 头像预览 */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            {selectedAvatar ? (
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white shadow-2xl">
                <img 
                  src={selectedAvatar} 
                  alt="预览"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-5xl font-semibold shadow-2xl ring-4 ring-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-4 border-white">
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-800">{user?.username}</p>
          <p className="text-sm text-gray-600">{user?.company}</p>
        </div>
      </div>

      {/* 头像网格 */}
      <div className="max-w-2xl mx-auto px-4 pb-6">
        <Card className="bg-white/60 backdrop-blur-xl border border-white/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-600 mb-4">选择你喜欢的头像</p>
            <div className="grid grid-cols-8 gap-3">
              {avatarPresets.map((preset) => {
                const colors = getGradientColors(preset.id);
                const isSelected = selectedAvatar === generateAvatarUrl(preset);
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelect(preset)}
                    className={`
                      relative aspect-square rounded-full flex items-center justify-center text-2xl
                      transition-all duration-200 hover:scale-110 hover:shadow-lg
                      ${isSelected ? 'ring-3 ring-blue-500 ring-offset-2 scale-110 shadow-lg' : ''}
                    `}
                    style={{
                      background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                    }}
                    title={preset.name}
                  >
                    {preset.emoji}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部保存按钮 */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <Button 
          onClick={handleSave}
          disabled={!selectedAvatar || saving}
          className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl shadow-lg"
        >
          {saving ? '保存中...' : '保存头像'}
        </Button>
      </div>
    </div>
  );
}
