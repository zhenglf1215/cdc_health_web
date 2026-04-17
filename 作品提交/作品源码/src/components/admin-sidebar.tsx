"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Globe,
  Menu,
  X,
  Activity,
  Home,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    label: "首页",
    href: "/admin",
    icon: Home,
  },
  {
    label: "用户管理",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "环境发布",
    href: "/admin/environments",
    icon: Globe,
  },
  {
    label: "环境CDC数据",
    href: "/admin/cdc-data",
    icon: Activity,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; company?: string } | null>(null);
  const [userAvatar, setUserAvatar] = useState<string>('');

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) {
      setUser(userData);
      
      // 优先从localStorage获取头像
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.avatar_url) {
            setUserAvatar(parsed.avatar_url);
          }
        } catch {
          // ignore
        }
      }
      
      // 加载用户头像
      fetch(`/api/profile?user_id=${userData.id}`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data?.avatar_url) {
            let avatarUrl = result.data.avatar_url;
            if (avatarUrl && !avatarUrl.startsWith('data:') && !avatarUrl.startsWith('http')) {
              avatarUrl = '/' + avatarUrl;
            }
            setUserAvatar(avatarUrl);
          }
        })
        .catch(console.error);
    }
  }, []);

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin" || pathname === "/admin/";
    }
    return pathname?.startsWith(href);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_role");
    window.location.href = "/products";
  };

  return (
    <>
      {/* 移动端菜单按钮 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass-effect rounded-xl shadow-lg"
      >
        <Menu className="w-6 h-6 text-gray-600" />
      </button>

      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 侧边栏 - macOS玻璃风格 */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen glass-sidebar text-gray-800 z-50 transition-all duration-300 flex flex-col shadow-xl",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* 头部 */}
        <div className="p-4 glass-sidebar">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold tracking-wide text-gray-900">CDC 健康检测</h1>
                <p className="text-xs text-gray-500">管理系统</p>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="p-4 glass-sidebar">
          <div className="flex items-center space-x-3">
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={user?.username}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20">
              {user?.username?.charAt(0).toUpperCase() || "A"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-900">{user?.username || "管理员"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.company || "CDC系统"}</p>
              </div>
            )}
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className={cn("text-xs text-gray-400 uppercase tracking-wider mb-2", collapsed && "text-center")}>
            {collapsed ? "导航" : "功能菜单"}
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-blue-500/20 to-orange-500/20 text-blue-700 backdrop-blur-sm font-medium shadow-md"
                    : "text-gray-700 hover:bg-white/50 hover:text-gray-900 backdrop-blur-sm"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", collapsed && "mx-auto")} />
                {!collapsed && <span className="ml-3 text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 底部操作 */}
        <div className="p-3 glass-sidebar space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-gray-500 hover:bg-red-50/50 hover:text-red-500 transition-all backdrop-blur-sm"
          >
            <LogOut className={cn("w-5 h-5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="ml-3 text-sm">退出登录</span>}
          </button>

          {/* 折叠按钮 */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-700/50 hover:text-white transition-all"
          >
            {collapsed ? (
              <>
                <ChevronRight className="w-5 h-5" />
                {!collapsed && <span className="ml-3 text-sm">展开</span>}
              </>
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="ml-3 text-sm">收起菜单</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 主内容区留白 */}
      <div className={cn("transition-all duration-300", collapsed ? "lg:ml-20" : "lg:ml-64")} />
    </>
  );
}
