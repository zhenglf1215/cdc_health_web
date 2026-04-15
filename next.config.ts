import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 禁用 Next.js DevTools（隐藏开发工具悬浮按钮）
  devIndicators: false,
  
  // 启用 React 严格模式
  reactStrictMode: true,
  
  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },
  
  // 编译优化 - 移除生产环境console
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
