'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

interface AlertUser {
  id: string;
  username: string;
  type: 'hr' | 'tcr';
  value: number;
}

interface User {
  id: string;
  username: string;
  company: string;
  phone: string;
  role: string;
  created_at: string;
  last_login: string;
}

// ========== 全局变量 ==========
let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let isPlayingAudio = false;
let debugTimer: NodeJS.Timeout | null = null;
let checkTimer: NodeJS.Timeout | null = null;

export function GlobalAlertBanner() {
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertType, setAlertType] = useState<string>('');
  const [alertTrigger, setAlertTrigger] = useState<'start' | 'end' | null>(null);

  // 播放报警声音
  const startBeep = useCallback(() => {
    if (isPlayingAudio) return;
    
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioCtx();
      oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      gain.gain.value = 0.3;
      oscillator.start();
      isPlayingAudio = true;
      console.log('声音开始');
    } catch (e) {
      console.error('播放失败:', e);
    }
  }, []);

  // 停止报警声音
  const stopBeep = useCallback(() => {
    if (!isPlayingAudio) return;
    
    try {
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
        oscillator = null;
      }
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      isPlayingAudio = false;
      console.log('声音停止');
    } catch (e) {
      console.error('停止失败:', e);
    }
  }, []);

  // 自动检测用户数据
  const checkUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?user_id=admin&user_role=admin');
      const data = await res.json();
      if (!data.success || !data.users) return;
      
      // 检测所有用户，不限制角色
      const users: User[] = data.users;
      const newAlerts: AlertUser[] = [];

      for (const user of users) {
        // 分别查询 HR 和 TCR 数据
        const [hrRes, tcrRes] = await Promise.all([
          fetch(`/api/vital-data?userId=${user.id}&type=hr&limit=5`),
          fetch(`/api/vital-data?userId=${user.id}&type=tcr&limit=5`)
        ]);
        const hrResult = await hrRes.json();
        const tcrResult = await tcrRes.json();
        
        let latestHr = 0;
        let latestTcr = 0;
        
        // 获取最新的 HR 值
        if (hrResult.success && hrResult.data && hrResult.data.length > 0) {
          const lastHr = hrResult.data[hrResult.data.length - 1];
          latestHr = lastHr?.value || 0;
        }
        
        // 获取最新的 TCR 值
        if (tcrResult.success && tcrResult.data && tcrResult.data.length > 0) {
          const lastTcr = tcrResult.data[tcrResult.data.length - 1];
          latestTcr = lastTcr?.value || 0;
        }
        
        if (latestHr >= 180) {
          newAlerts.push({ id: user.id, username: user.username, type: 'hr', value: latestHr });
        }
        if (latestTcr >= 38) {
          newAlerts.push({ id: user.id, username: user.username, type: 'tcr', value: latestTcr });
        }
      }

      const hasAlert = newAlerts.length > 0;
      
      // 报警开始
      if (hasAlert && !isAlerting) {
        setAlertTrigger('start');
        const hrAlert = newAlerts.find(u => u.type === 'hr');
        const tcrAlert = newAlerts.find(u => u.type === 'tcr');
        if (hrAlert) setAlertType(`HR=${hrAlert.value}≥180`);
        else if (tcrAlert) setAlertType(`Tcr=${tcrAlert.value}≥38`);
        startBeep();
        setIsAlerting(true);
        setAlertUsers(newAlerts);
        (window as any).__globalAlert = { users: newAlerts, isAlerting: true };
      }
      
      // 报警结束
      if (!hasAlert && isAlerting) {
        setAlertTrigger('end');
        stopBeep();
        setIsAlerting(false);
        setAlertUsers([]);
        (window as any).__globalAlert = { users: [], isAlerting: false };
        setTimeout(() => setAlertTrigger(null), 3000);
      }
      
    } catch (error) {
      console.error('检查用户失败:', error);
    }
  }, [isAlerting, startBeep, stopBeep]);

  // 触发报警（调试用）
  const triggerAlert = useCallback((alert: AlertUser, duration = 10000) => {
    console.log('触发报警:', alert, '持续', duration, 'ms');
    
    if (debugTimer) clearTimeout(debugTimer);
    if (checkTimer) clearInterval(checkTimer);
    
    setAlertUsers([alert]);
    setIsAlerting(true);
    setAlertTrigger('start');
    setAlertType(alert.type === 'hr' ? `HR=${alert.value}≥180` : `Tcr=${alert.value}≥38`);
    startBeep();
    (window as any).__globalAlert = { users: [alert], isAlerting: true };
    
    debugTimer = setTimeout(() => {
      setAlertTrigger('end');
      setIsAlerting(false);
      setAlertUsers([]);
      stopBeep();
      (window as any).__globalAlert = { users: [], isAlerting: false };
      setTimeout(() => setAlertTrigger(null), 3000);
      
      // 重新启动自动检测
      checkTimer = setInterval(checkUsers, 3000);
    }, duration);
  }, [startBeep, stopBeep, checkUsers]);

  // 清除报警
  const clearAlert = useCallback(() => {
    console.log('清除报警');
    
    if (debugTimer) clearTimeout(debugTimer);
    
    setAlertTrigger('end');
    setIsAlerting(false);
    setAlertUsers([]);
    stopBeep();
    (window as any).__globalAlert = { users: [], isAlerting: false };
    setTimeout(() => setAlertTrigger(null), 3000);
  }, [stopBeep]);

  // 初始化
  useEffect(() => {
    checkTimer = setInterval(checkUsers, 3000);
    (window as any).__triggerAlert = triggerAlert;
    (window as any).__clearAlert = clearAlert;
    
    return () => {
      if (checkTimer) clearInterval(checkTimer);
      if (debugTimer) clearTimeout(debugTimer);
      (window as any).__triggerAlert = undefined;
      (window as any).__clearAlert = undefined;
    };
  }, [triggerAlert, clearAlert, checkUsers]);

  if (!isAlerting && alertTrigger !== 'end') return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-3 shadow-lg text-white animate-pulse ${
        alertTrigger === 'end' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {alertTrigger === 'end' ? (
            <>
              <span className="text-xl">✅</span>
              <span className="text-lg font-medium">报警结束</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-6 h-6" />
              <div className="flex items-center gap-4">
                <span className="text-sm px-3 py-1 rounded bg-yellow-400 text-red-800 font-medium">
                  报警开始（{alertType}）
                </span>
                {alertUsers.map((alert, i) => (
                  <span key={i}>
                    <strong>{alert.username}</strong>: 
                    {alert.type === 'hr' ? `HR ${alert.value} bpm` : `Tcr ${alert.value}°C`}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={clearAlert} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
      </div>
    </div>
  );
}
