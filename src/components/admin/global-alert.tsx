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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  
  const [alertType, setAlertType] = useState<string>('');
  const [alertTrigger, setAlertTrigger] = useState<'start' | 'active' | 'end' | null>(null);

  // 记录当前异常的用户
  const currentAlertsRef = useRef<Map<string, AlertUser>>(new Map());
  const wasAlertingRef = useRef(false);

  // 播放提示音（持续）
  const playBeep = useCallback(() => {
    try {
      // 停止之前的
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1000;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      
      oscRef.current = osc;
      gainRef.current = gain;
    } catch (e) {
      console.error('播放声音失败');
    }
  }, []);

  // 停止声音
  const stopBeep = useCallback(() => {
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
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
      const alertUsers = Array.from(newAlerts.values());
      
      // 判断报警状态变化
      if (hasAlert && !wasAlertingRef.current) {
        // 报警开始：播放持续声音
        setAlertTrigger('start');
        const hrAlert = alertUsers.find(u => u.type === 'hr');
        const tcrAlert = alertUsers.find(u => u.type === 'tcr');
        if (hrAlert) setAlertType(`HR=${hrAlert.value}≥180`);
        else if (tcrAlert) setAlertType(`Tcr=${tcrAlert.value}≥38`);
        playBeep();
      } else if (hasAlert && wasAlertingRef.current) {
        // 报警持续
        setAlertTrigger('active');
      } else if (!hasAlert && wasAlertingRef.current) {
        // 报警结束：停止声音
        setAlertTrigger('end');
        stopBeep();
      }
      
      wasAlertingRef.current = hasAlert;
      setIsAlerting(hasAlert);
      setAlertUsers(alertUsers);
      
      // 同步到 window 供其他组件使用
      (window as unknown as { __globalAlert?: { users: AlertUser[]; isAlerting: boolean } }).__globalAlert = {
        users: alertUsers,
        isAlerting
      };

      // 更新当前报警引用
      currentAlertsRef.current = newAlerts;

    } catch (error) {
      console.error('检查用户失败:', error);
    }
  }, [isAlerting, playBeep, stopBeep]);

  useEffect(() => {
    checkUsers();
    const interval = setInterval(checkUsers, POLL_INTERVAL);
    let debugTimer: NodeJS.Timeout | null = null;
    
    // 暴露调试方法到 window
    (window as unknown as { __triggerAlert?: (alert: AlertUser, duration?: number) => void }).__triggerAlert = (alert: AlertUser, duration = 10000) => {
      const newAlerts = [...alertUsers, alert];
      setIsAlerting(true);
      setAlertUsers(newAlerts);
      setAlertTrigger('start');
      const hrAlert = newAlerts.find(u => u.type === 'hr');
      const tcrAlert = newAlerts.find(u => u.type === 'tcr');
      if (hrAlert) setAlertType(`HR=${hrAlert.value}≥180`);
      else if (tcrAlert) setAlertType(`Tcr=${tcrAlert.value}≥38`);
      (window as unknown as { __globalAlert?: { users: AlertUser[]; isAlerting: boolean } }).__globalAlert = {
        users: newAlerts,
        isAlerting: true
      };
      playBeep();
      // 调试模式：持续10秒后自动结束（声音同步停止）
      if (debugTimer) clearTimeout(debugTimer);
      debugTimer = setTimeout(() => {
        setAlertTrigger('end');
        setIsAlerting(false);
        setAlertUsers([]);
        stopBeep(); // 声音同步停止
        (window as unknown as { __globalAlert?: { users: AlertUser[]; isAlerting: boolean } }).__globalAlert = {
          users: [],
          isAlerting: false
        };
        // 3秒后清除结束状态
        setTimeout(() => {
          setAlertTrigger(null);
        }, 3000);
      }, 10000);
    };
    
    (window as unknown as { __clearAlert?: () => void }).__clearAlert = () => {
      if (debugTimer) clearTimeout(debugTimer);
      setAlertTrigger('end');
      setIsAlerting(false);
      setAlertUsers([]);
      (window as unknown as { __globalAlert?: { users: AlertUser[]; isAlerting: boolean } }).__globalAlert = {
        users: [],
        isAlerting: false
      };
      stopBeep(); // 声音同步停止
    };
    
    return () => {
      clearInterval(interval);
      if (debugTimer) clearTimeout(debugTimer);
      stopBeep();
      (window as unknown as { __triggerAlert?: undefined; __clearAlert?: undefined }).__triggerAlert = undefined;
      (window as unknown as { __triggerAlert?: undefined; __clearAlert?: undefined }).__clearAlert = undefined;
    };
  }, [checkUsers, playBeep, stopBeep]);

  if (!isAlerting && alertTrigger !== 'end') return null;

  // 报警结束状态显示3秒后消失
  const showEndState = alertTrigger === 'end' && isAlerting === false;

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

// 导出呼吸报警状态供其他组件使用
export function useAlertState() {
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  
  // 这个可以在其他组件中使用
  return { isAlerting, alertUsers };
}
