'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Activity, 
  HeartPulse,
  Database,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Home
} from 'lucide-react';
import { getCurrentUser, logout, type UserInfo } from '@/lib/auth';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  subItems?: { title: string; href: string }[];
}

interface ApplicantSidebarProps {
  user: UserInfo;
  userAvatar?: string;
}

export function ApplicantSidebar({ user, userAvatar }: ApplicantSidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['personal', 'data']));
  const [mobileOpen, setMobileOpen] = useState(false);

  // 默认导航项
  const navItems: NavItem[] = [
    {
      title: '首页',
      href: '/applicant/home',
      icon: <Home className="w-5 h-5" />
    },
    {
      title: '个人中心',
      href: '/applicant/profile',
      icon: <User className="w-5 h-5" />
    },
    {
      title: '个人CDC数据',
      href: '/applicant',
      icon: <Database className="w-5 h-5" />
    },
    {
      title: '生命体征监测',
      href: '/applicant/vital-signs',
      icon: <HeartPulse className="w-5 h-5" />,
      subItems: [
        { title: 'Tcr', href: '/applicant/vitals/tcr' },
        { title: 'Tsk', href: '/applicant/vitals/tsk' },
        { title: 'HR', href: '/applicant/vitals/hr' },
        { title: 'M', href: '/applicant/vitals/metabolic' }
      ]
    }
  ];

  const toggleGroup = (groupTitle: string, href: string) => {
    // 如果是"生命体征"并且当前已展开，则跳转到主页面
    if (groupTitle === '生命体征' && expandedGroups.has(groupTitle)) {
      window.location.href = href;
      return;
    }
    
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupTitle)) {
      newExpanded.delete(groupTitle);
    } else {
      newExpanded.add(groupTitle);
    }
    setExpandedGroups(newExpanded);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/products';
  };

  const isActive = (href: string) => {
    // 精确匹配
    if (href === '/applicant/home') {
      return pathname === '/applicant/home';
    }
    // CDC数据页面
    if (href === '/applicant/cdc-measure') {
      return pathname === '/applicant/cdc-measure';
    }
    if (href === '/applicant/profile') {
      return pathname === '/applicant/profile';
    }
    // 生命体征监测主页
    if (href === '/applicant/vital-signs') {
      return pathname === '/applicant/vital-signs';
    }
    return pathname === href;
  };

  // 渲染导航项
  const renderNavItem = (item: NavItem) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isGroupExpanded = expandedGroups.has(item.title);
    const isCurrentActive = isActive(item.href);

    return (
      <div key={item.title}>
        {hasSubItems ? (
          <>
            <button
              onClick={() => toggleGroup(item.title, item.href)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg mx-2 ${
                isCurrentActive 
                  ? 'bg-gradient-to-r from-blue-500/20 to-orange-500/20 text-blue-700 backdrop-blur-sm' 
                  : 'text-gray-700 hover:bg-white/50 backdrop-blur-sm'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-3">{item.icon}</span>
                <span>{item.title}</span>
              </div>
              {isGroupExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {isGroupExpanded && item.subItems && (
              <div className="mx-2 my-1 space-y-1">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-2 pl-10 text-sm transition-all duration-200 rounded-lg ${
                      pathname === subItem.href
                        ? 'bg-gradient-to-r from-blue-500/20 to-orange-500/20 text-blue-700 font-medium backdrop-blur-sm'
                        : 'text-gray-600 hover:bg-white/50 backdrop-blur-sm'
                    }`}
                  >
                    {subItem.title}
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <Link
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
              isCurrentActive 
                ? 'bg-gradient-to-r from-blue-500/20 to-orange-500/20 text-blue-700 backdrop-blur-sm' 
                : 'text-gray-700 hover:bg-white/50 backdrop-blur-sm'
            }`}
          >
            <span className="mr-3">{item.icon}</span>
            <span>{item.title}</span>
          </Link>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 侧边栏 - macOS玻璃风格 */}
      <aside className={`
        fixed left-0 top-0 h-full w-64 glass-sidebar z-50
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* 头部 */}
        <div className="h-16 flex items-center justify-between px-4 glass-sidebar">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">CDC健康检测</h1>
              <p className="text-xs text-gray-500">应用者</p>
            </div>
          </div>
          <button 
            className="md:hidden p-2 text-gray-500 hover:bg-white/50 rounded-lg transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 用户信息 */}
        <div className="p-4 glass-sidebar">
          <div className="flex items-center space-x-3">
            {/* 头像显示 - 使用div直接支持data URL */}
            <div className="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-orange-500">
              {userAvatar ? (
                <img 
                  src={userAvatar} 
                  alt={user.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // 如果头像加载失败，显示首字母
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              {!userAvatar && (
                <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user.username}</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {user.role === 'admin' ? '管理员' : '应用者'}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 truncate">{user.company}</p>
        </div>

        {/* 导航 */}
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="space-y-1">
            {navItems.map(renderNavItem)}
          </div>
        </nav>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 移动端菜单按钮 */}
      <button
        className="md:hidden fixed bottom-4 right-4 z-40 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}
