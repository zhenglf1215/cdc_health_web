'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Save, 
  Camera, 
  Heart,
  Activity,
  Phone,
  Mail,
  Calendar,
  Droplet,
  Pill,
  AlertCircle,
  Moon,
  Wine,
  Cigarette,
  UserCheck,
  PhoneCall,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { getCurrentUser, logout, type UserInfo } from '@/lib/auth';
import AppleAvatarUploader from '@/components/ui/apple-avatar-uploader';

interface UserProfile {
  user_id: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  blood_type?: string;
  medical_history?: string;
  allergies?: string;
  exercise_frequency?: string;
  sleep_hours?: number;
  smoking_status?: string;
  drinking_status?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  resting_hr?: number; // 静息心率
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<UserProfile>({
    user_id: '',
    gender: 'male',
    exercise_frequency: 'occasionally',
    smoking_status: 'never',
    drinking_status: 'never'
  });

  // BMI 状态
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string>('');

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
      
      setUser(userData);
      setProfile(prev => ({ ...prev, user_id: userData.id }));
      
      // 加载用户资料
      try {
        const response = await fetch(`/api/profile?user_id=${userData.id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setProfile(prev => ({ ...prev, ...result.data }));
          if (result.data.height && result.data.weight) {
            calculateBMI(result.data.height, result.data.weight);
          }
        }
      } catch (error) {
        console.error('加载用户资料失败:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 计算 BMI
  const calculateBMI = (height: number, weight: number) => {
    if (height > 0 && weight > 0) {
      const bmiValue = weight / Math.pow(height / 100, 2);
      setBmi(Number(bmiValue.toFixed(1)));
      
      if (bmiValue < 18.5) setBmiCategory('偏瘦');
      else if (bmiValue < 24) setBmiCategory('正常');
      else if (bmiValue < 28) setBmiCategory('偏胖');
      else setBmiCategory('肥胖');
    }
  };

  // 处理身高体重变化
  const handlePhysicalChange = (field: 'height' | 'weight', value: string) => {
    const numValue = parseFloat(value);
    setProfile(prev => ({ ...prev, [field]: numValue }));
    
    if (field === 'height' && profile.weight) {
      calculateBMI(numValue, profile.weight);
    } else if (field === 'weight' && profile.height) {
      calculateBMI(profile.height, numValue);
    }
  };

  // 处理头像上传
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '请选择图片文件' });
      return;
    }

    // 验证文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: '图片大小不能超过 2MB' });
      return;
    }

    setAvatarUploading(true);
    
    try {
      // 转换为 base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfile(prev => ({ ...prev, avatar_url: base64 }));
        setAvatarUploading(false);
      };
      reader.onerror = () => {
        setMessage({ type: 'error', text: '图片读取失败' });
        setAvatarUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('头像上传失败:', error);
      setMessage({ type: 'error', text: '头像上传失败' });
      setAvatarUploading(false);
    }
  };

  // 保存资料
  const handleSave = async () => {
    if (!profile.user_id) {
      setMessage({ type: 'error', text: '用户未登录' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: '保存成功！' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.message || '保存失败' });
      }
    } catch (error) {
      console.error('保存失败:', error);
      setMessage({ type: 'error', text: '保存失败，请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  // 退出登录
  const handleLogout = () => {
    logout();
    window.location.href = '/products';
  };

  // 获取头像 initials
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200">
      {/* 头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">个人中心</h1>
              <p className="text-sm text-gray-500">{user?.username}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/applicant'}>
            返回主页
          </Button>
        </div>
      </header>

      {/* 消息提示 */}
      {message && (
        <div className={`max-w-4xl mx-auto px-4 pt-4`}>
          <div className={`p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* 内容 */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 头像卡片 - 苹果风格 */}
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <AppleAvatarUploader
              currentAvatar={profile.avatar_url}
              username={user?.username}
              onAvatarChange={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))}
              size="lg"
            />
            <div className="text-center mt-4">
              <h3 className="text-lg font-semibold text-gray-900">{user?.username}</h3>
              <p className="text-sm text-gray-500">{user?.company}</p>
              <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-700">
                {user?.role === 'admin' ? '管理员' : '应用者'}
              </Badge>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/avatar-select'}
              >
                选择预设头像
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              基本信息
            </CardTitle>
            <CardDescription>您的账号基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>用户名</Label>
                <Input value={user?.username || ''} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label>角色</Label>
                <Input value={user?.role === 'admin' ? '管理员' : '应用者'} disabled className="bg-gray-50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-1" />
                  邮箱
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱"
                  value={profile.email || ''}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">
                  <Phone className="w-4 h-4 inline mr-1" />
                  手机号
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="birth_date">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  出生日期
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={profile.birth_date || ''}
                  onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="gender">性别</Label>
                <select
                  id="gender"
                  className="w-full h-10 px-3 border rounded-md bg-white"
                  value={profile.gender || 'male'}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 身体数据 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              身体数据
            </CardTitle>
            <CardDescription>您的身体测量数据，用于健康分析</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="height">身高 (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="如：170"
                  value={profile.height || ''}
                  onChange={(e) => handlePhysicalChange('height', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="weight">体重 (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="如：65"
                  value={profile.weight || ''}
                  onChange={(e) => handlePhysicalChange('weight', e.target.value)}
                />
              </div>
              <div>
                <Label>BMI</Label>
                <div className="h-10 px-3 flex items-center border rounded-md bg-gray-50">
                  {bmi ? (
                    <span className="flex items-center space-x-2">
                      <span className="font-semibold">{bmi}</span>
                      <Badge variant={bmiCategory === '正常' ? 'default' : 'secondary'}>
                        {bmiCategory}
                      </Badge>
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="resting_hr">
                  <Activity className="w-4 h-4 inline mr-1" />
                  静息心率 (bpm)
                </Label>
                <Input
                  id="resting_hr"
                  type="number"
                  placeholder="如：65"
                  value={profile.resting_hr || ''}
                  onChange={(e) => setProfile({ ...profile, resting_hr: parseInt(e.target.value) || undefined })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="blood_type">
                  <Droplet className="w-4 h-4 inline mr-1" />
                  血型
                </Label>
                <select
                  id="blood_type"
                  className="w-full h-10 px-3 border rounded-md bg-white"
                  value={profile.blood_type || ''}
                  onChange={(e) => setProfile({ ...profile, blood_type: e.target.value })}
                >
                  <option value="">请选择</option>
                  <option value="A">A型</option>
                  <option value="B">B型</option>
                  <option value="AB">AB型</option>
                  <option value="O">O型</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 健康信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              健康信息
            </CardTitle>
            <CardDescription>既往病史和过敏史（选填）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="medical_history">
                <Pill className="w-4 h-4 inline mr-1" />
                既往病史
              </Label>
              <textarea
                id="medical_history"
                className="w-full h-20 px-3 py-2 border rounded-md resize-none"
                placeholder="请输入既往病史，如：无 / 高血压病史2年"
                value={profile.medical_history || ''}
                onChange={(e) => setProfile({ ...profile, medical_history: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="allergies">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                过敏史
              </Label>
              <textarea
                id="allergies"
                className="w-full h-20 px-3 py-2 border rounded-md resize-none"
                placeholder="请输入过敏史，如：无 / 青霉素过敏"
                value={profile.allergies || ''}
                onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 生活方式 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Moon className="w-5 h-5 mr-2" />
              生活方式
            </CardTitle>
            <CardDescription>您的日常习惯（选填）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="exercise_frequency">锻炼频率</Label>
                <select
                  id="exercise_frequency"
                  className="w-full h-10 px-3 border rounded-md bg-white"
                  value={profile.exercise_frequency || 'occasionally'}
                  onChange={(e) => setProfile({ ...profile, exercise_frequency: e.target.value })}
                >
                  <option value="never">从不运动</option>
                  <option value="occasionally">偶尔运动</option>
                  <option value="weekly">每周1-2次</option>
                  <option value="frequently">每周3-5次</option>
                  <option value="daily">每天运动</option>
                </select>
              </div>
              <div>
                <Label htmlFor="sleep_hours">
                  <Moon className="w-4 h-4 inline mr-1" />
                  每日睡眠时长 (小时)
                </Label>
                <Input
                  id="sleep_hours"
                  type="number"
                  step="0.5"
                  placeholder="如：7.5"
                  value={profile.sleep_hours || ''}
                  onChange={(e) => setProfile({ ...profile, sleep_hours: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smoking_status">
                  <Cigarette className="w-4 h-4 inline mr-1" />
                  吸烟状况
                </Label>
                <select
                  id="smoking_status"
                  className="w-full h-10 px-3 border rounded-md bg-white"
                  value={profile.smoking_status || 'never'}
                  onChange={(e) => setProfile({ ...profile, smoking_status: e.target.value })}
                >
                  <option value="never">从不吸烟</option>
                  <option value="quit">已戒烟</option>
                  <option value="occasionally">偶尔吸烟</option>
                  <option value="daily">每天吸烟</option>
                </select>
              </div>
              <div>
                <Label htmlFor="drinking_status">
                  <Wine className="w-4 h-4 inline mr-1" />
                  饮酒状况
                </Label>
                <select
                  id="drinking_status"
                  className="w-full h-10 px-3 border rounded-md bg-white"
                  value={profile.drinking_status || 'never'}
                  onChange={(e) => setProfile({ ...profile, drinking_status: e.target.value })}
                >
                  <option value="never">从不饮酒</option>
                  <option value="occasionally">偶尔饮酒</option>
                  <option value="weekly">每周饮酒</option>
                  <option value="daily">每天饮酒</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 紧急联系人 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PhoneCall className="w-5 h-5 mr-2" />
              紧急联系人
            </CardTitle>
            <CardDescription>用于紧急情况时联系（选填）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">
                  <UserCheck className="w-4 h-4 inline mr-1" />
                  联系人姓名
                </Label>
                <Input
                  id="emergency_contact_name"
                  placeholder="请输入紧急联系人姓名"
                  value={profile.emergency_contact_name || ''}
                  onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">
                  <PhoneCall className="w-4 h-4 inline mr-1" />
                  联系人电话
                </Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  placeholder="请输入紧急联系人电话"
                  value={profile.emergency_contact_phone || ''}
                  onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => window.location.href = '/applicant'}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存资料
              </>
            )}
          </Button>
        </div>

        {/* 退出登录 */}
        <Card className="bg-gray-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">退出登录</h3>
                <p className="text-sm text-gray-500">退出当前账号</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
