'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface AlertUser {
  id: string;
  username: string;
  type: 'hr' | 'tcr';
  value: number;
}

// 报警阈值
const HR_THRESHOLD = 180;
const TCR_THRESHOLD = 38;
const POLL_INTERVAL = 5000;

// 缓存用户列表
let cachedUsers: { id: string; username: string; role: string }[] = [];
let cacheTime = 0;

export function GlobalAlertBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  
  // 已触发的报警
  const triggeredRef = useRef<Set<string>>(new Set());
  // 上次异常状态
  const prevAlertRef = useRef<Set<string>>(new Set());

  // 播放警报音
  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      const now = ctx.currentTime;
      
      for (let i = 0; i < 10; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, now + i);
        gain.gain.setValueAtTime(0, now + i + 0.2);
        gain.gain.setValueAtTime(0.3, now + i + 0.4);
        gain.gain.setValueAtTime(0, now + i + 0.6);
        gain.gain.setValueAtTime(0.3, now + i + 0.8);
        gain.gain.setValueAtTime(0, now + i + 1);
        osc.start(now + i);
        osc.stop(now + i + 1);
      }
    } catch (e) {
      console.error('播放声音失败');
    }
  }, []);

  // 检查所有用户 - 直接从vital_records获取数据
  const checkUsers = useCallback(async () => {
    const now = Date.now();
    
    try {
      // 缓存用户列表（30秒）
      if (!cachedUsers.length || now - cacheTime > 30000) {
        const res = await fetch('/api/users?user_id=admin&user_role=admin');
        const data = await res.json();
        if (data.success && data.users) {
          cachedUsers = data.users.filter((u: { role: string }) => u.role === 'applicant');
          cacheTime = now;
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const newAlerts: AlertUser[] = [];

      for (const user of cachedUsers) {
        try {
          // 直接从vital_records获取最新数据
          const response = await fetch(`/api/vital-data?userId=${user.id}&timeRange=date:${today}&limit=1`);
          const data = await response.json();
          
          if (data.success && data.records && data.records.length > 0) {
            // 获取最新的hr和tcr值
            let latestHr = 0;
            let latestTcr = 0;
            
            for (const record of data.records) {
              if (record.data_type === 'hr') {
                latestHr = parseFloat(record.value);
              } else if (record.data_type === 'tcr') {
                latestTcr = parseFloat(record.value);
              }
            }
            
            // 如果没有数据，跳过
            if (latestHr === 0 && latestTcr === 0) continue;
            
            const hrKey = `${user.id}-hr`;
            const tcrKey = `${user.id}-tcr`;

            const hrIsAlert = latestHr >= HR_THRESHOLD;
            const tcrIsAlert = latestTcr >= TCR_THRESHOLD;

            // HR检查：上次正常 + 本次异常 + 未触发过 → 触发报警
            const hrPrevAlert = prevAlertRef.current.has(hrKey);
            if (hrIsAlert && !hrPrevAlert && !triggeredRef.current.has(hrKey)) {
              triggeredRef.current.add(hrKey);
              newAlerts.push({ id: user.id, username: user.username, type: 'hr', value: latestHr });
            }

            // Tcr检查：上次正常 + 本次异常 + 未触发过 → 触发报警
            const tcrPrevAlert = prevAlertRef.current.has(tcrKey);
            if (tcrIsAlert && !tcrPrevAlert && !triggeredRef.current.has(tcrKey)) {
              triggeredRef.current.add(tcrKey);
              newAlerts.push({ id: user.id, username: user.username, type: 'tcr', value: latestTcr });
            }

            // 更新上次异常状态
            if (hrIsAlert) {
              prevAlertRef.current.add(hrKey);
            } else {
              prevAlertRef.current.delete(hrKey);
              triggeredRef.current.delete(hrKey);
            }

            if (tcrIsAlert) {
              prevAlertRef.current.add(tcrKey);
            } else {
              prevAlertRef.current.delete(tcrKey);
              triggeredRef.current.delete(tcrKey);
            }
          }
        } catch (e) {
          console.error(`检查用户 ${user.username} 失败:`, e);
        }
      }

      // 触发新报警
      if (newAlerts.length > 0) {
        setAlertUsers(newAlerts);
        setShowBanner(true);
        playSound();
        setTimeout(() => setShowBanner(false), 30000);
      }
    } catch (error) {
      console.error('检查用户失败:', error);
    }
  }, [playSound]);

  useEffect(() => {
    checkUsers();
    const interval = setInterval(checkUsers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkUsers]);

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          <div className="flex items-center gap-4">
            {alertUsers.map((alert, index) => (
              <span key={`${alert.id}-${alert.type}-${index}`}>
                <strong>{alert.username}</strong>: 
                {alert.type === 'hr' ? `心率 ${alert.value} bpm` : `核心体温 ${alert.value}°C`} 异常!
              </span>
            ))}
          </div>
        </div>
        <button 
          onClick={() => setShowBanner(false)}
          className="text-white/80 hover:text-white text-2xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
