'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-black z-[9999]">
      {/* 展示网页层 - vascular_tunnel 作为可交互网页 */}
      <iframe
        src="/vascular_tunnel.html"
        className="w-full h-full border-none"
        allow="autoplay"
      />
      
      {/* 底部选项卡 - 覆盖在网页上方 */}
      <div className="absolute bottom-0 left-0 right-0 z-[9999]">
        <div className="flex items-center justify-center gap-8 pb-12">
          <button
            onClick={() => router.push('/products')}
            className="group px-12 py-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-white text-xl font-bold hover:scale-105 transition-transform shadow-2xl backdrop-blur-sm"
          >
            <div className="mb-2 text-3xl">🫀</div>
            CDC 智能监测系统
            <div className="text-sm font-normal mt-2 opacity-80">
              点击进入
            </div>
          </button>
          <button
            onClick={() => router.push('/auth')}
            className="group px-12 py-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl text-white text-xl font-bold hover:scale-105 transition-transform shadow-2xl backdrop-blur-sm"
          >
            <div className="mb-2 text-3xl">🔐</div>
            登录 / 注册
            <div className="text-sm font-normal mt-2 opacity-80">
              已有账号
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
