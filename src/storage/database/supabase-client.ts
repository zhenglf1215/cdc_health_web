import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 支持多种环境变量命名方式
function getEnv(key: string): string | undefined {
  // 优先使用 COZE_ 前缀（Coze 平台标准）
  if (process.env[`COZE_${key}`]) {
    return process.env[`COZE_${key}`];
  }
  // 然后尝试 NEXT_PUBLIC_ 前缀（前端兼容）
  if (process.env[`NEXT_PUBLIC_${key}`]) {
    return process.env[`NEXT_PUBLIC_${key}`];
  }
  // 最后尝试不带前缀
  return process.env[key];
}

interface SupabaseCredentials {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

function getSupabaseCredentials(): SupabaseCredentials {
  const url = getEnv('SUPABASE_URL');
  const anonKey = getEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!url) {
    throw new Error('SUPABASE_URL is not set');
  }
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is not set');
  }

  return { url, anonKey, serviceRoleKey };
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey, serviceRoleKey } = getSupabaseCredentials();

  let key: string;
  if (token) {
    // 带 token：使用 anon_key + 用户 token，受 RLS 约束
    key = anonKey;
  } else {
    // 不带 token：优先使用 service_role_key 绕过 RLS
    key = serviceRoleKey ?? anonKey;
  }

  if (token) {
    return createClient(url, key, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { getSupabaseCredentials, getSupabaseClient };
