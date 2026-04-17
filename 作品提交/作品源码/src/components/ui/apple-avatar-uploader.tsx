'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Check } from 'lucide-react';

interface AppleAvatarUploaderProps {
  currentAvatar?: string;
  username?: string;
  onAvatarChange: (avatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
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
];

// 背景颜色
const bgColors = [
  'bg-gradient-to-br from-blue-400 to-blue-600',
  'bg-gradient-to-br from-purple-400 to-purple-600',
  'bg-gradient-to-br from-pink-400 to-pink-600',
  'bg-gradient-to-br from-green-400 to-green-600',
  'bg-gradient-to-br from-orange-400 to-orange-600',
  'bg-gradient-to-br from-red-400 to-red-600',
  'bg-gradient-to-br from-cyan-400 to-cyan-600',
  'bg-gradient-to-br from-yellow-400 to-yellow-600',
];

export default function AppleAvatarUploader({
  currentAvatar,
  username = 'User',
  onAvatarChange,
  size = 'md'
}: AppleAvatarUploaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16 text-2xl',
    md: 'w-24 h-24 text-4xl',
    lg: 'w-32 h-32 text-5xl',
  };

  // 根据用户名生成一致的背景色
  const getBgColor = (name: string) => {
    const index = name.charCodeAt(0) % bgColors.length;
    return bgColors[index];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setPreviewUrl(url);
        setSelectedPreset(null);
        onAvatarChange(url);
        setIsEditing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetSelect = (preset: typeof avatarPresets[0]) => {
    const url = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${getGradientColors(preset.id).from}"/>
            <stop offset="100%" style="stop-color:${getGradientColors(preset.id).to}"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#bg)"/>
        <text x="50" y="65" font-size="45" text-anchor="middle" fill="white">${preset.emoji}</text>
      </svg>`
    )}`;
    setSelectedAvatar(url);
    setSelectedPreset(preset.id);
    setPreviewUrl(null);
    onAvatarChange(url);
    setIsEditing(false);
  };

  const getGradientColors = (id: string) => {
    const colors = [
      { from: '#60A5FA', to: '#2563EB' },
      { from: '#A78BFA', to: '#7C3AED' },
      { from: '#F472B6', to: '#DB2777' },
      { from: '#4ADE80', to: '#16A34A' },
      { from: '#FB923C', to: '#EA580C' },
      { from: '#F87171', to: '#DC2626' },
      { from: '#22D3EE', to: '#0891B2' },
      { from: '#FACC15', to: '#CA8A04' },
    ];
    const index = parseInt(id) % colors.length;
    return colors[index];
  };

  const displayAvatar = previewUrl || selectedAvatar || currentAvatar;
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 头像显示 */}
      <div className="relative group">
        {displayAvatar ? (
          <div 
            className={`${sizeClasses[size]} rounded-full overflow-hidden ring-4 ring-white shadow-xl transition-all duration-300 group-hover:ring-blue-400`}
          >
            <img 
              src={displayAvatar} 
              alt={username}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div 
            className={`${sizeClasses[size]} rounded-full ${getBgColor(username)} flex items-center justify-center text-white font-semibold shadow-xl ring-4 ring-white transition-all duration-300 group-hover:ring-blue-400`}
          >
            {initial}
          </div>
        )}

        {/* 悬停时的编辑按钮 */}
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Camera className="w-5 h-5 text-gray-700" />
          </div>
        </button>

        {/* 已选择指示器 */}
        {selectedAvatar && !isEditing && (
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-white">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* 编辑面板 - 苹果风格网格选择 */}
      {isEditing && (
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm font-semibold text-gray-700 mb-3">选择头像</p>
          
          {/* 预设头像网格 - 苹果Memoji风格 */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {avatarPresets.map((preset) => {
              const colors = getGradientColors(preset.id);
              const isSelected = selectedPreset === preset.id && !previewUrl;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center text-2xl
                    transition-all duration-200 hover:scale-110 hover:shadow-lg
                    ${isSelected ? 'ring-3 ring-blue-500 ring-offset-2 scale-110' : ''}
                  `}
                  style={{
                    background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                  }}
                  title={preset.name}
                >
                  {preset.emoji}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 上传自定义图片 */}
          <div className="border-t border-gray-200 pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors duration-200 font-medium"
            >
              <Upload className="w-4 h-4" />
              上传照片
            </button>
          </div>

          {/* 取消按钮 */}
          <button
            onClick={() => setIsEditing(false)}
            className="w-full mt-2 px-4 py-2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
          >
            取消
          </button>
        </div>
      )}

      {/* 编辑按钮（未悬停时显示） */}
      {!isEditing && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsEditing(true)}
          className="text-xs h-8"
        >
          <Camera className="w-3 h-3 mr-1" />
          更换头像
        </Button>
      )}
    </div>
  );
}

// 导出预设头像供其他组件使用
export { avatarPresets, bgColors };
