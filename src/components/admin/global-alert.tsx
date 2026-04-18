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

  // 触发报警（调试用）
  const triggerAlert = useCallback((alert: AlertUser, duration = 10000) => {
    console.log('触发报警:', alert, '持续', duration, 'ms');
    
    // 清除之前的定时器
    if (debugTimer) {
      clearTimeout(debugTimer);
      debugTimer = null;
    }
    
    // 更新状态
    setAlertUsers([alert]);
    setIsAlerting(true);
    setAlertTrigger('start');
    setAlertType(alert.type === 'hr' ? `HR=${alert.value}≥180` : `Tcr=${alert.value}≥38`);
    
    // 播放声音
    startBeep();
    
    // 更新全局状态
    (window as any).__globalAlert = { users: [alert], isAlerting: true };
    
    // 定时结束
    debugTimer = setTimeout(() => {
      setAlertTrigger('end');
      setIsAlerting(false);
      setAlertUsers([]);
      stopBeep();
      (window as any).__globalAlert = { users: [], isAlerting: false };
      
      // 3秒后清除结束状态
      setTimeout(() => setAlertTrigger(null), 3000);
    }, duration);
  }, [startBeep, stopBeep]);

  // 清除报警
  const clearAlert = useCallback(() => {
    console.log('清除报警');
    
    if (debugTimer) {
      clearTimeout(debugTimer);
      debugTimer = null;
    }
    
    setAlertTrigger('end');
    setIsAlerting(false);
    setAlertUsers([]);
    stopBeep();
    (window as any).__globalAlert = { users: [], isAlerting: false };
    
    setTimeout(() => setAlertTrigger(null), 3000);
  }, [stopBeep]);

  // 暴露到 window
  useEffect(() => {
    (window as any).__triggerAlert = triggerAlert;
    (window as any).__clearAlert = clearAlert;
    
    return () => {
      (window as any).__triggerAlert = undefined;
      (window as any).__clearAlert = undefined;
      if (debugTimer) clearTimeout(debugTimer);
    };
  }, [triggerAlert, clearAlert]);

  // 不显示时返回 null
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
                <span>
                  <strong>{alertUsers[0]?.username}</strong>: 
                  {alertUsers[0]?.type === 'hr' ? `HR ${alertUsers[0]?.value} bpm` : `Tcr ${alertUsers[0]?.value}°C`}
                </span>
              </div>
            </>
          )}
        </div>
        <button 
          onClick={clearAlert}
          className="text-white/80 hover:text-white text-2xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
