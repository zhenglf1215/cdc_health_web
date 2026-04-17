'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Lock, Building2, Users, Compass } from 'lucide-react';
import '@/styles/cdc-animations.css';

// 苹果风格的全屏Loading覆盖层
function AppleLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200">
      {/* 背景模糊层 */}
      <div className="absolute inset-0 backdrop-blur-sm"></div>
      
      {/* 中央Loading容器 */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Apple风格Logo */}
        <div className="w-20 h-20 mb-6 relative">
          {/* 外圈 */}
          <div className="absolute inset-0 rounded-full border-[3px] border-white/20"></div>
          {/* 渐变旋转圈 */}
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-white animate-spin" style={{ animationDuration: '1s' }}></div>
          {/* 渐变旋转圈2 */}
          <div className="absolute inset-[6px] rounded-full border-[2px] border-transparent border-r-white/60 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}></div>
          {/* 中心图标 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="w-8 h-8 text-white/90" />
          </div>
        </div>
        
        {/* 文字 */}
        <p className="text-white/90 text-lg font-medium tracking-wide animate-pulse">加载中</p>
        
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
    </div>
  );
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'applicant',
    company: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '登录失败');
        }

        // 保存用户信息到 localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // 登录成功，跳转到对应页面
        if (data.user.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/applicant';
        }
      } else {
        // 注册
        if (formData.password !== formData.confirmPassword) {
          throw new Error('两次密码输入不一致');
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            role: formData.role,
            company: formData.company,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '注册失败');
        }

        // 注册成功，自动登录
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok) {
          // 保存用户信息到 localStorage
          localStorage.setItem('user', JSON.stringify(loginData.user));
          
          if (loginData.user.role === 'admin') {
            window.location.href = '/admin';
          } else {
            window.location.href = '/applicant';
          }
        } else {
          setError('注册成功，但自动登录失败，请手动登录');
          setIsLogin(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToGuide = () => {
    window.location.href = '/guide';
  };

  // loading时显示Apple风格覆盖层
  if (loading) {
    return <AppleLoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl bg-white/40 backdrop-blur-xl border border-white/30 fade-in-up">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <Users className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">
            CDC健康检测
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {isLogin ? '登录您的账户' : '创建新账户'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">确认密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="请再次输入密码"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="pl-10"
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">角色</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="applicant">应用者</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">企业名称（可选）</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="请输入企业名称"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 shadow-lg shadow-blue-500/30 spring-bounce"
              disabled={loading}
            >
              {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData({
                    username: '',
                    password: '',
                    confirmPassword: '',
                    role: 'applicant',
                    company: '',
                  });
                }}
                className="text-blue-600 hover:text-orange-600 transition-colors"
                disabled={loading}
              >
                {isLogin ? '没有账户？立即注册' : '已有账户？立即登录'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              测试账户：user1 / user123（应用者）
              <br />
              admin / admin123（管理者）
            </p>
          </div>

          {/* 新手引导入口 */}
          <div className="mt-4">
            <button
              onClick={handleGoToGuide}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <Compass className="w-5 h-5" />
              <span className="font-medium">新手引导</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
