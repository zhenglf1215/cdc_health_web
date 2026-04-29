'use client';

import { useEffect, useState } from 'react';

export default function Splash() {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    fetch('/vascular_tunnel.html')
      .then(res => res.text())
      .then(html => setHtmlContent(html))
      .catch(err => console.error('Failed to load vascular_tunnel.html:', err));
  }, []);

  if (!htmlContent) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={htmlContent}
      className="w-full h-full border-none"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
