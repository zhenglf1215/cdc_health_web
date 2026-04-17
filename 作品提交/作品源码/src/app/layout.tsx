import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CDC健康检测',
    template: '%s | CDC健康检测',
  },
  description:
    'CDC健康检测应用，提供环境数据管理、用户管理和CDC计算功能。',
  keywords: ['CDC健康检测', '环境适应能力', 'CDC计算', '心率监测', '温度监测', '生命体征'],
  authors: [{ name: 'CDC Health Detection Team' }],
  generator: 'CDC健康检测',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
