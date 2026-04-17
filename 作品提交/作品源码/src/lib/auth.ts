/**
 * 认证工具函数
 * 统一管理 Cookie 和 localStorage 的用户认证
 */

// Cookie 相关工具函数
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// 用户信息接口
export interface UserInfo {
  id: string;
  username: string;
  role: 'applicant' | 'admin';
  company?: string;
  created_at?: string;
}

/**
 * 获取当前用户信息
 * 优先从 Cookie 获取，如果没有则尝试 localStorage
 */
export function getCurrentUser(): UserInfo | null {
  // 优先从 Cookie 获取
  const userId = getCookie('user_id');
  const userRole = getCookie('user_role');
  const username = getCookie('username');

  if (userId && userRole && username) {
    return {
      id: userId,
      username: username,
      role: userRole as 'applicant' | 'admin',
    };
  }

  // 回退到 localStorage
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * 检查用户是否已登录
 */
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

/**
 * 检查用户角色
 */
export function hasRole(role: 'applicant' | 'admin'): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

/**
 * 退出登录
 */
export function logout(): void {
  // 清除 Cookie
  if (typeof document !== 'undefined') {
    document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
  // 清除 localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
}

/**
 * 保存用户信息到 localStorage（用于兼容）
 */
export function saveUserToLocalStorage(user: UserInfo): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

/**
 * 检查并重定向到登录页
 * 返回用户信息，如果未登录则重定向并返回 null
 */
export function checkAuthAndRedirect(): UserInfo | null {
  const user = getCurrentUser();
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/products';
    }
    return null;
  }
  return user;
}

/**
 * 检查角色并重定向
 */
export function checkRoleAndRedirect(expectedRole: 'applicant' | 'admin'): UserInfo | null {
  const user = getCurrentUser();
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/products';
    }
    return null;
  }
  if (user.role !== expectedRole) {
    // 角色不匹配，跳转到对应角色页面
    if (typeof window !== 'undefined') {
      window.location.href = user.role === 'admin' ? '/admin' : '/applicant';
    }
    return null;
  }
  return user;
}
