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
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  
  // 记录当前异常的用户
  const currentAlertsRef = useRef<Map<string, AlertUser>>(new Map());

  // 播放警报音
  const startSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      
      // 停止之前的
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current = null;
      }
      
      // 创建持续警报音
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.value = 0.2;
      
      osc.start();
      oscillatorRef.current = osc;
      gainRef.current = gain;
    } catch (e) {
      console.error('播放声音失败');
    }
  }, []);

  // 停止警报音
  const stopSound = useCallback(() => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current = null;
      }
    } catch (e) {
      // 忽略
    }
  }, []);

  // 检查所有用户
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

      const newAlerts: Map<string, AlertUser> = new Map();

      for (const user of cachedUsers) {
        try {
          // 从vital_records获取最新数据
          const response = await fetch(`/api/vital-data?userId=${user.id}&limit=5`);
          const data = await response.json();
          
          if (data.success && data.data && data.data.length > 0) {
            let latestHr = 0;
            let latestTcr = 0;
            
            // 获取最新的hr和tcr
            for (const record of data.data) {
              if (record.data_type === 'hr') {
                latestHr = parseFloat(record.value);
              } else if (record.data_type === 'tcr') {
                latestTcr = parseFloat(record.value);
              }
            }
            
            if (latestHr === 0 && latestTcr === 0) continue;

            // HR检查
            if (latestHr >= HR_THRESHOLD) {
              newAlerts.set(`${user.id}-hr`, { 
                id: user.id, 
                username: user.username, 
                type: 'hr', 
                value: latestHr 
              });
            }

            // Tcr检查
            if (latestTcr >= TCR_THRESHOLD) {
              newAlerts.set(`${user.id}-tcr`, { 
                id: user.id, 
                username: user.username, 
                type: 'tcr', 
                value: latestTcr 
              });
            }
          }
        } catch (e) {
          console.error(`检查用户 ${user.username} 失败:`, e);
        }
      }

      // 更新报警状态
      const hasAlert = newAlerts.size > 0;
      setIsAlerting(hasAlert);
      setAlertUsers(Array.from(newAlerts.values()));

      // 同步声音
      if (hasAlert && !isAlerting) {
        startSound();
      } else if (!hasAlert && isAlerting) {
        stopSound();
      }

      // 更新当前报警引用
      currentAlertsRef.current = newAlerts;

    } catch (error) {
      console.error('检查用户失败:', error);
    }
  }, [isAlerting, startSound, stopSound]);

  useEffect(() => {
    checkUsers();
    const interval = setInterval(checkUsers, POLL_INTERVAL);
    
    // 暴露调试方法到 window
    (window as unknown as { __triggerAlert?: (alert: AlertUser) => void }).__triggerAlert = (alert: AlertUser) => {
      setIsAlerting(true);
      setAlertUsers(prev => {
        const filtered = prev.filter(a => !(a.id === alert.id && a.type === alert.type));
        return [...filtered, alert];
      });
      startSound();
    };
    
    (window as unknown as { __clearAlert?: () => void }).__clearAlert = () => {
      setIsAlerting(false);
      setAlertUsers([]);
      stopSound();
    };
    
    return () => {
      clearInterval(interval);
      stopSound();
      (window as unknown as { __triggerAlert?: undefined; __clearAlert?: undefined }).__triggerAlert = undefined;
      (window as unknown as { __triggerAlert?: undefined; __clearAlert?: undefined }).__clearAlert = undefined;
    };
  }, [checkUsers, stopSound, startSound]);

  if (!isAlerting) return null;

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
          onClick={() => {
            setIsAlerting(false);
            setAlertUsers([]);
            stopSound();
          }}
          className="text-white/80 hover:text-white text-2xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// 导出呼吸报警状态供其他组件使用
export function useAlertState() {
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  
  // 这个可以在其他组件中使用
  return { isAlerting, alertUsers };
}
