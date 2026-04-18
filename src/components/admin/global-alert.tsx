'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

const POLL_INTERVAL = 3000; // 3秒轮询

export function GlobalAlertBanner() {
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertType, setAlertType] = useState<string>('');
  const [alertTrigger, setAlertTrigger] = useState<'start' | 'active' | 'end' | null>(null);

  // 音频 refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const isPlayingRef = useRef(false);
  
  // 报警状态 refs（用于调试回调）
  const isAlertingRef = useRef(false);
  const alertUsersRef = useRef<AlertUser[]>([]);
  const setIsAlertingRef = useRef<((v: boolean) => void) | null>(null);
  const setAlertUsersRef = useRef<((v: AlertUser[]) => void) | null>(null);

  // 播放声音
  const playBeep = useCallback(() => {
    if (isPlayingRef.current) return;
    
    try {
      const AudioCtx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = 1000;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      
      osc.start();
      
      audioCtxRef.current = ctx;
      oscRef.current = osc;
      isPlayingRef.current = true;
    } catch (e) {
      console.error('播放声音失败', e);
    }
  }, []);

  // 停止声音
  const stopBeep = useCallback(() => {
    if (!isPlayingRef.current) return;
    
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      isPlayingRef.current = false;
    } catch (e) {
      // 忽略
    }
  }, []);

  // 检查用户数据
  const checkUsers = useCallback(async () => {
    try {
      // 获取所有用户
      const res = await fetch('/api/users?user_id=admin&user_role=admin');
      const data = await res.json();
      
      if (!data.success || !data.users) return;
      
      const users: User[] = data.users.filter((u: User) => u.role === 'applicant');
      const newAlerts: AlertUser[] = [];

      for (const user of users) {
        const response = await fetch(`/api/vital-data?userId=${user.id}&limit=5`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          let latestHr = 0;
          let latestTcr = 0;
          
          for (const record of result.data) {
            if (record.data_type === 'hr') {
              latestHr = parseFloat(record.value);
            } else if (record.data_type === 'tcr') {
              latestTcr = parseFloat(record.value);
            }
          }
          
          // 检查报警条件
          if (latestHr >= 180) {
            newAlerts.push({
              id: user.id,
              username: user.username,
              type: 'hr',
              value: latestHr
            });
          }
          
          if (latestTcr >= 38) {
            newAlerts.push({
              id: user.id,
              username: user.username,
              type: 'tcr',
              value: latestTcr
            });
          }
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
        playBeep();
      }
      
      // 报警结束
      if (!hasAlert && isAlerting) {
        setAlertTrigger('end');
        stopBeep();
        setTimeout(() => setAlertTrigger(null), 3000);
      }
      
      setIsAlerting(hasAlert);
      setAlertUsers(newAlerts);
      
      // 同步到 window
      (window as unknown as { __globalAlert?: { users: AlertUser[]; isAlerting: boolean } }).__globalAlert = {
        users: newAlerts,
        isAlerting
      };
      
    } catch (error) {
      console.error('检查用户失败:', error);
    }
  }, [isAlerting, playBeep, stopBeep]);

  // 初始化
  useEffect(() => {
    // 保存 setState 函数到 ref
    setIsAlertingRef.current = setIsAlerting;
    setAlertUsersRef.current = setAlertUsers;
    
    checkUsers();
    const interval = setInterval(checkUsers, POLL_INTERVAL);
    
    // 暴露调试方法
    const triggerAlert = (alert: AlertUser) => {
      const currentUsers = alertUsersRef.current || [];
      const newAlerts = [...currentUsers, alert];
      
      if (setIsAlertingRef.current) setIsAlertingRef.current(true);
      if (setAlertUsersRef.current) setAlertUsersRef.current(newAlerts);
      isAlertingRef.current = true;
      alertUsersRef.current = newAlerts;
      
      setAlertTrigger('start');
      if (alert.type === 'hr') setAlertType(`HR=${alert.value}≥180`);
      else setAlertType(`Tcr=${alert.value}≥38`);
      playBeep();
      
      // 10秒后自动结束
      setTimeout(() => {
        setAlertTrigger('end');
        if (setIsAlertingRef.current) setIsAlertingRef.current(false);
        if (setAlertUsersRef.current) setAlertUsersRef.current([]);
        isAlertingRef.current = false;
        alertUsersRef.current = [];
        stopBeep();
        setTimeout(() => setAlertTrigger(null), 3000);
      }, 10000);
    };
    
    const clearAlert = () => {
      setAlertTrigger('end');
      if (setIsAlertingRef.current) setIsAlertingRef.current(false);
      if (setAlertUsersRef.current) setAlertUsersRef.current([]);
      isAlertingRef.current = false;
      alertUsersRef.current = [];
      stopBeep();
      setTimeout(() => setAlertTrigger(null), 3000);
    };
    
    (window as unknown as { __triggerAlert?: typeof triggerAlert }).__triggerAlert = triggerAlert;
    (window as unknown as { __clearAlert?: typeof clearAlert }).__clearAlert = clearAlert;
    
    return () => {
      clearInterval(interval);
      stopBeep();
      (window as unknown as { __triggerAlert?: undefined }).__triggerAlert = undefined;
      (window as unknown as { __clearAlert?: undefined }).__clearAlert = undefined;
    };
  }, [checkUsers, playBeep, stopBeep]);

  // 显示结束状态
  const showEndState = alertTrigger === 'end' && !isAlerting;

  if (!isAlerting && alertTrigger !== 'end') return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-3 shadow-lg text-white animate-pulse ${
        showEndState ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showEndState ? (
            <>
              <span className="text-xl">✅</span>
              <span className="text-lg font-medium">报警结束</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-6 h-6" />
              <div className="flex items-center gap-4">
                <span className={`text-sm px-3 py-1 rounded ${
                  alertTrigger === 'start' 
                    ? 'bg-yellow-400 text-red-800 font-medium' 
                    : 'bg-white/20'
                }`}>
                  {alertTrigger === 'start' 
                    ? `报警开始（${alertType}）` 
                    : '报警中...'}
                </span>
                {alertUsers.map((alert, index) => (
                  <span key={`${alert.id}-${alert.type}-${index}`}>
                    <strong>{alert.username}</strong>: 
                    {alert.type === 'hr' ? `HR ${alert.value} bpm` : `Tcr ${alert.value}°C`}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <button 
          onClick={() => {
            setIsAlerting(false);
            setAlertUsers([]);
            setAlertTrigger(null);
            stopBeep();
          }}
          className="text-white/80 hover:text-white text-2xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
