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
let beepInterval: NodeJS.Timeout | null = null;
let debugTimer: NodeJS.Timeout | null = null;
let checkTimer: NodeJS.Timeout | null = null;

export function GlobalAlertBanner() {
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [alertType, setAlertType] = useState<string>('');
  const [alertTrigger, setAlertTrigger] = useState<'start' | 'end' | null>(null);

  // 初始化音频上下文（需要用户交互）
  const initAudio = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioCtx();
      console.log('音频上下文已初始化');
    } catch (e) {
      console.error('音频初始化失败:', e);
    }
  }, []);

  // 播放持续报警声音
  const startBeep = useCallback(() => {
    if (!audioContext) {
      console.log('音频未就绪');
      return;
    }
    if (isPlayingAudio) return;
    
    try {
      // 停止之前的
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
      }
      
      oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = 880; // A5 音调
      oscillator.type = 'square';
      gain.gain.value = 0.15;
      oscillator.start();
      
      isPlayingAudio = true;
      console.log('声音开始');
    } catch (e) {
      console.error('播放失败:', e);
    }
  }, []);

  // 停止报警声音
  const stopBeep = useCallback(() => {
    isPlayingAudio = false;
    
    try {
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
        oscillator = null;
      }
      console.log('声音停止');
    } catch (e) {
      console.error('停止失败:', e);
    }
  }, []);

  // 确认报警（手动消除声音）
  const confirmAlert = useCallback(() => {
    console.log('确认报警');
    stopBeep();
    setIsConfirmed(true);
    setAlertUsers([]);
    setIsAlerting(false);
    (window as any).__globalAlert = { users: [], isAlerting: false, isConfirmed: true };
  }, [stopBeep]);

  // 自动检测用户数据
  const checkUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?user_id=admin&user_role=admin');
      const data = await res.json();
      if (!data.success || !data.users) return;
      
      const users: User[] = data.users;
      const newAlerts: AlertUser[] = [];

      for (const user of users) {
        const [hrRes, tcrRes] = await Promise.all([
          fetch(`/api/vital-data?userId=${user.id}&type=hr&limit=5`),
          fetch(`/api/vital-data?userId=${user.id}&type=tcr&limit=5`)
        ]);
        const hrResult = await hrRes.json();
        const tcrResult = await tcrRes.json();
        
        let latestHr = 0;
        let latestTcr = 0;
        
        if (hrResult.success && hrResult.data && hrResult.data.length > 0) {
          const lastHr = hrResult.data[hrResult.data.length - 1];
          latestHr = lastHr?.value || 0;
        }
        
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
      
      // 报警开始（自动播放声音）
      if (hasAlert && !isAlerting && !isConfirmed) {
        setAlertTrigger('start');
        const hrAlert = newAlerts.find(u => u.type === 'hr');
        const tcrAlert = newAlerts.find(u => u.type === 'tcr');
        if (hrAlert) setAlertType(`HR=${hrAlert.value}≥180`);
        else if (tcrAlert) setAlertType(`Tcr=${tcrAlert.value}≥38`);
        startBeep();
        setIsAlerting(true);
        setAlertUsers(newAlerts);
        (window as any).__globalAlert = { users: newAlerts, isAlerting: true, isConfirmed: false };
      }
      
      // 已确认状态下，异常还在但声音已停
      if (hasAlert && isConfirmed) {
        setAlertUsers(newAlerts);
        (window as any).__globalAlert = { users: newAlerts, isAlerting: true, isConfirmed: true };
      }
      
      // 恢复正常 - 报警结束
      if (!hasAlert && (isAlerting || isConfirmed)) {
        setAlertTrigger('end');
        stopBeep();
        setIsAlerting(false);
        setIsConfirmed(false);
        setAlertUsers([]);
        (window as any).__globalAlert = { users: [], isAlerting: false, isConfirmed: false };
        setTimeout(() => setAlertTrigger(null), 3000);
      }
      
    } catch (error) {
      console.error('检查用户失败:', error);
    }
  }, [isAlerting, isConfirmed, startBeep, stopBeep]);

  // 触发报警（调试用）
  const triggerAlert = useCallback((alert: AlertUser, duration = 10000) => {
    console.log('触发报警:', alert, '持续', duration, 'ms');
    
    if (debugTimer) clearTimeout(debugTimer);
    if (checkTimer) clearInterval(checkTimer);
    
    setIsConfirmed(false);
    setAlertUsers([alert]);
    setIsAlerting(true);
    setAlertTrigger('start');
    setAlertType(alert.type === 'hr' ? `HR=${alert.value}≥180` : `Tcr=${alert.value}≥38`);
    startBeep();
    (window as any).__globalAlert = { users: [alert], isAlerting: true, isConfirmed: false };
    
    debugTimer = setTimeout(() => {
      setAlertTrigger('end');
      setIsAlerting(false);
      setIsConfirmed(false);
      setAlertUsers([]);
      stopBeep();
      (window as any).__globalAlert = { users: [], isAlerting: false, isConfirmed: false };
      setTimeout(() => setAlertTrigger(null), 3000);
      
      checkTimer = setInterval(checkUsers, 3000);
    }, duration);
  }, [startBeep, stopBeep, checkUsers]);

  // 清除报警
  const clearAlert = useCallback(() => {
    confirmAlert();
  }, [confirmAlert]);

  // 初始化
  useEffect(() => {
    checkTimer = setInterval(checkUsers, 3000);
    (window as any).__triggerAlert = triggerAlert;
    (window as any).__clearAlert = clearAlert;
    (window as any).__initAudio = initAudio;
    
    return () => {
      if (checkTimer) clearInterval(checkTimer);
      if (debugTimer) clearTimeout(debugTimer);
      if (beepInterval) clearInterval(beepInterval);
      (window as any).__triggerAlert = undefined;
      (window as any).__clearAlert = undefined;
      (window as any).__initAudio = undefined;
    };
  }, [triggerAlert, clearAlert, checkUsers, initAudio]);

  if (!isAlerting && alertTrigger !== 'end') return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-3 shadow-lg text-white ${
        alertTrigger === 'end' ? 'bg-green-600' : 'bg-red-600 animate-pulse'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {alertTrigger === 'end' ? (
            <>
              <span className="text-xl">✅</span>
              <span className="text-lg font-medium">报警结束 - 数据已恢复正常</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-6 h-6" />
              <div className="flex items-center gap-4">
                <span className="text-sm px-3 py-1 rounded bg-yellow-400 text-red-800 font-medium">
                  {isConfirmed ? '已确认' : '报警'}（{alertType}）
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
        <div className="flex items-center gap-2">
          {/* 确认按钮 */}
          {isAlerting && !isConfirmed && (
            <button 
              onClick={confirmAlert}
              className="px-4 py-1 bg-white/20 hover:bg-white/30 rounded font-medium transition"
            >
              确认
            </button>
          )}
          {/* 关闭按钮 */}
          <button onClick={clearAlert} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
        </div>
      </div>
    </div>
  );
}
