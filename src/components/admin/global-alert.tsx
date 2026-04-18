'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface AlertUser {
  id: string;
  username: string;
  type: 'hr' | 'tcr';
  value: number;
  time: string; // 报警时间（北京时间）
}

// 报警阈值
const HR_THRESHOLD = 180;
const TCR_THRESHOLD = 38;
const POLL_INTERVAL = 3000; // 每3秒检查一次

// 缓存用户列表
let cachedUsers: { id: string; username: string; role: string }[] = [];
let cacheTime = 0;

export function GlobalAlertBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  
  // 上次报警的时间（北京时间，格式：YYYY-MM-DD HH:mm）
  const lastAlertTimeRef = useRef<string>('');
  // 当前正在显示的报警信息
  const currentAlertsRef = useRef<Map<string, AlertUser>>(new Map());

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

  // 获取北京时间格式的时间字符串
  const getBeijingTime = (date: Date): string => {
    // 北京时间 = UTC时间 + 8小时
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingTime = new Date(date.getTime() + beijingOffset);
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    const hour = String(beijingTime.getUTCHours()).padStart(2, '0');
    const minute = String(beijingTime.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  // 检查所有用户
  const checkUsers = useCallback(async () => {
    const now = Date.now();
    const currentBeijingTime = getBeijingTime(new Date(now));
    
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

      const newAlerts: AlertUser[] = [];

      for (const user of cachedUsers) {
        try {
          // 直接从vital_records获取最新数据（按时间降序）
          const response = await fetch(`/api/vital-data?userId=${user.id}&limit=5`);
          const data = await response.json();
          
          if (data.success && data.records && data.records.length > 0) {
            let latestHr = 0;
            let latestTcr = 0;
            let latestTime = '';
            
            // 遍历所有记录，找到最新的hr和tcr
            for (const record of data.records) {
              const recordTime = record.recorded_at || record.timestamp || record.created_at;
              const timeStr = recordTime ? getBeijingTime(new Date(recordTime)) : '';
              
              if (record.data_type === 'hr' && !latestHr) {
                latestHr = parseFloat(record.value);
                latestTime = timeStr;
              } else if (record.data_type === 'tcr' && !latestTcr) {
                latestTcr = parseFloat(record.value);
                if (!latestTime) latestTime = timeStr;
              }
              
              // 如果都找到了，退出循环
              if (latestHr && latestTcr) break;
            }
            
            // 如果没有有效数据，跳过
            if (latestHr === 0 && latestTcr === 0) continue;
            
            const hrKey = `${user.id}-hr`;
            const tcrKey = `${user.id}-tcr`;

            // 检查是否异常
            const hrIsAlert = latestHr >= HR_THRESHOLD;
            const tcrIsAlert = latestTcr >= TCR_THRESHOLD;

            // HR报警判断：异常 + 当前分钟未报警过
            if (hrIsAlert) {
              const hrAlertKey = `${hrKey}-${currentBeijingTime}`;
              if (!currentAlertsRef.current.has(hrAlertKey)) {
                newAlerts.push({ 
                  id: user.id, 
                  username: user.username, 
                  type: 'hr', 
                  value: latestHr,
                  time: latestTime || currentBeijingTime
                });
                currentAlertsRef.current.set(hrAlertKey, { 
                  id: user.id, 
                  username: user.username, 
                  type: 'hr', 
                  value: latestHr,
                  time: latestTime || currentBeijingTime
                });
              }
            } else {
              // HR恢复正常，清除该用户HR的报警记录
              currentAlertsRef.current.forEach((_, key) => {
                if (key.startsWith(hrKey)) {
                  currentAlertsRef.current.delete(key);
                }
              });
            }

            // Tcr报警判断：异常 + 当前分钟未报警过
            if (tcrIsAlert) {
              const tcrAlertKey = `${tcrKey}-${currentBeijingTime}`;
              if (!currentAlertsRef.current.has(tcrAlertKey)) {
                newAlerts.push({ 
                  id: user.id, 
                  username: user.username, 
                  type: 'tcr', 
                  value: latestTcr,
                  time: latestTime || currentBeijingTime
                });
                currentAlertsRef.current.set(tcrAlertKey, { 
                  id: user.id, 
                  username: user.username, 
                  type: 'tcr', 
                  value: latestTcr,
                  time: latestTime || currentBeijingTime
                });
              }
            } else {
              // Tcr恢复正常，清除该用户Tcr的报警记录
              currentAlertsRef.current.forEach((_, key) => {
                if (key.startsWith(tcrKey)) {
                  currentAlertsRef.current.delete(key);
                }
              });
            }
          }
        } catch (e) {
          console.error(`检查用户 ${user.username} 失败:`, e);
        }
      }

      // 触发新报警
      if (newAlerts.length > 0) {
        setAlertUsers(prev => {
          // 合并现有报警和新报警
          const merged = new Map<string, AlertUser>();
          prev.forEach(alert => merged.set(`${alert.id}-${alert.type}`, alert));
          newAlerts.forEach(alert => merged.set(`${alert.id}-${alert.type}`, alert));
          return Array.from(merged.values());
        });
        
        setShowBanner(true);
        playSound();
        
        // 更新上次报警时间
        lastAlertTimeRef.current = currentBeijingTime;
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
                <span className="text-red-200 ml-1">[{alert.time}]</span>
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
