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
const POLL_INTERVAL = 3000;

// 缓存用户列表
let cachedUsers: { id: string; username: string; role: string }[] = [];
let cacheTime = 0;

export function GlobalAlertBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  
  // 记录每分钟的报警状态（防止同一分钟重复报警）
  // 格式：分钟时间戳 -> Set<用户ID+类型>
  const alertedMinutesRef = useRef<Map<number, Set<string>>>(new Map());

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

  // 获取北京时间分钟时间戳
  const getBeijingMinuteTimestamp = (): number => {
    const now = new Date();
    // 北京时间 = UTC + 8小时
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    // 设置为分钟级别（忽略秒和毫秒）
    beijingTime.setSeconds(0, 0);
    return beijingTime.getTime();
  };

  // 检查所有用户
  const checkUsers = useCallback(async () => {
    const currentMinute = getBeijingMinuteTimestamp();
    
    try {
      // 缓存用户列表（30秒）
      const now = Date.now();
      if (!cachedUsers.length || now - cacheTime > 30000) {
        const res = await fetch('/api/users?user_id=admin&user_role=admin');
        const data = await res.json();
        if (data.success && data.users) {
          cachedUsers = data.users.filter((u: { role: string }) => u.role === 'applicant');
          cacheTime = now;
        }
      }

      const newAlerts: AlertUser[] = [];

      for (const user of cachedUsers) {
        try {
          // 从vital_records获取最新数据
          const response = await fetch(`/api/vital-data?userId=${user.id}&limit=5`);
          const data = await response.json();
          
          if (data.success && data.records && data.records.length > 0) {
            let latestHr = 0;
            let latestTcr = 0;
            
            // 获取最新的hr和tcr
            for (const record of data.records) {
              if (record.data_type === 'hr') {
                latestHr = parseFloat(record.value);
              } else if (record.data_type === 'tcr') {
                latestTcr = parseFloat(record.value);
              }
            }
            
            if (latestHr === 0 && latestTcr === 0) continue;

            // HR报警
            if (latestHr >= HR_THRESHOLD) {
              const alertKey = `${user.id}-hr`;
              const alerted = alertedMinutesRef.current.get(currentMinute);
              if (!alerted?.has(alertKey)) {
                newAlerts.push({ id: user.id, username: user.username, type: 'hr', value: latestHr });
                if (!alertedMinutesRef.current.has(currentMinute)) {
                  alertedMinutesRef.current.set(currentMinute, new Set());
                }
                alertedMinutesRef.current.get(currentMinute)!.add(alertKey);
              }
            }

            // Tcr报警
            if (latestTcr >= TCR_THRESHOLD) {
              const alertKey = `${user.id}-tcr`;
              const alerted = alertedMinutesRef.current.get(currentMinute);
              if (!alerted?.has(alertKey)) {
                newAlerts.push({ id: user.id, username: user.username, type: 'tcr', value: latestTcr });
                if (!alertedMinutesRef.current.has(currentMinute)) {
                  alertedMinutesRef.current.set(currentMinute, new Set());
                }
                alertedMinutesRef.current.get(currentMinute)!.add(alertKey);
              }
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
      }

      // 清理旧的分钟记录（只保留最近5分钟）
      const fiveMinutesAgo = currentMinute - 5 * 60 * 1000;
      alertedMinutesRef.current.forEach((_, timestamp) => {
        if (timestamp < fiveMinutesAgo) {
          alertedMinutesRef.current.delete(timestamp);
        }
      });

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
