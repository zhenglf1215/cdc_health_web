'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface UserProfileData {
  birth_date?: string;
  weight?: number;
  resting_hr?: number;
}

interface AlertUser {
  id: string;
  username: string;
  type: 'hr' | 'tcr';
  value: number;
}

// 报警阈值
const HR_THRESHOLD = 180;
const TCR_THRESHOLD = 38;
const SOUND_DURATION = 10000;
const VISUAL_DURATION = 30000;
const POLL_INTERVAL = 5000;

// 简化：缓存用户列表
let cachedUsers: { id: string; username: string; role: string }[] = [];
let cacheTime = 0;

export function GlobalAlertBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [alertUsers, setAlertUsers] = useState<AlertUser[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  
  // 已触发的报警（报警过一次的指标，清除需等恢复正常）
  const triggeredRef = useRef<Set<string>>(new Set());
  // 上次异常状态（用于检测状态变化：从正常→异常才触发）
  const prevAlertRef = useRef<Set<string>>(new Set());
  
  const soundEndRef = useRef(0);
  const visualEndRef = useRef(0);

  // 播放10秒警报
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

  // 计算
  const calculate = useCallback((hr: number, age: number, weight: number, restingHr: number) => {
    const mi = 65 + ((hr - restingHr) / Math.max(1, 180 - 0.65 * age - restingHr)) * ((41.7 - 0.22 * age) * Math.pow(weight, 2/3) - 65);
    // 简化的Tcr计算（单点）
    const tcr = 36.8 + 0.0036 * (Math.max(0, Math.min(600, mi)) - 55) * 0.0952;
    return { mi: Math.max(0, Math.min(600, mi)), tcr: Math.max(35, Math.min(40, tcr)) };
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

      const today = new Date().toISOString().split('T')[0];
      const newAlerts: AlertUser[] = [];
      const currentAlerts: string[] = [];

      for (const user of cachedUsers) {
        try {
          // 获取profile和HR数据
          const [profileRes, hrRes] = await Promise.all([
            fetch(`/api/profile?user_id=${user.id}`),
            fetch(`/api/heart-rate/history?userId=${user.id}&timeRange=date:${today}`)
          ]);

          let profile: UserProfileData = { resting_hr: 65 };
          const profileData = await profileRes.json();
          if (profileData.data) profile = profileData.data;

          const hrData = await hrRes.json();
          if (hrData.success && hrData.data) {
            const hrRecords = hrData.data
              .filter((r: { data_type: string }) => r.data_type === 'hr')
              .sort((a: { recorded_at: string }, b: { recorded_at: string }) => 
                new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
              );

            if (hrRecords.length > 0) {
              const hr = parseFloat(hrRecords[0].value);
              const age = profile.birth_date ? Math.floor((now - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 30;
              const { tcr } = calculate(hr, age, profile.weight || 65, profile.resting_hr || 65);

              const hrKey = `${user.id}-hr`;
              const tcrKey = `${user.id}-tcr`;

              const hrIsAlert = hr >= HR_THRESHOLD;
              const tcrIsAlert = tcr >= TCR_THRESHOLD;

              // 记录当前异常状态
              if (hrIsAlert) currentAlerts.push(hrKey);
              if (tcrIsAlert) currentAlerts.push(tcrKey);

              // HR检查：上次正常 + 本次异常 + 未触发过 → 触发报警
              const hrPrevAlert = prevAlertRef.current.has(hrKey);
              if (hrIsAlert && !hrPrevAlert && !triggeredRef.current.has(hrKey)) {
                triggeredRef.current.add(hrKey);
                newAlerts.push({ id: user.id, username: user.username, type: 'hr', value: hr });
              }

              // TCR检查：上次正常 + 本次异常 + 未触发过 → 触发报警
              const tcrPrevAlert = prevAlertRef.current.has(tcrKey);
              if (tcrIsAlert && !tcrPrevAlert && !triggeredRef.current.has(tcrKey)) {
                triggeredRef.current.add(tcrKey);
                newAlerts.push({ id: user.id, username: user.username, type: 'tcr', value: tcr });
              }

              // 更新上次异常状态
              if (hrIsAlert) {
                prevAlertRef.current.add(hrKey);
              } else {
                prevAlertRef.current.delete(hrKey);
                // 恢复正常时清除触发记录，下次异常可重新触发
                triggeredRef.current.delete(hrKey);
              }

              if (tcrIsAlert) {
                prevAlertRef.current.add(tcrKey);
              } else {
                prevAlertRef.current.delete(tcrKey);
                // 恢复正常时清除触发记录，下次异常可重新触发
                triggeredRef.current.delete(tcrKey);
              }
            }
          }
        } catch {
          // 单个用户失败不影响其他
        }
      }

      // 触发新报警
      if (newAlerts.length > 0) {
        setAlertUsers(prev => {
          const filtered = prev.filter(u => !currentAlerts.includes(`${u.id}-${u.type}`));
          return [...filtered, ...newAlerts];
        });
        setShowBanner(true);
        if (soundEndRef.current < now) {
          playSound();
          soundEndRef.current = now + SOUND_DURATION;
        }
        visualEndRef.current = now + VISUAL_DURATION;
      }

      // 检查是否结束
      if (soundEndRef.current > 0 && now >= soundEndRef.current) soundEndRef.current = 0;
      if (visualEndRef.current > 0 && now >= visualEndRef.current) {
        visualEndRef.current = 0;
        // 报警结束，清空所有报警状态
        setShowBanner(false);
        setAlertUsers([]);
      }

    } catch (error) {
      // 静默失败
    }
  }, [playSound, calculate]);

  // 轮询
  useEffect(() => {
    checkUsers();
    const interval = setInterval(checkUsers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkUsers]);

  // 暴露给调试
  useEffect(() => {
    (window as unknown as { 
      __triggerAlert?: (alert: AlertUser) => void;
      __clearAlert?: () => void;
      __globalAlert?: { show: boolean; users: AlertUser[]; hrAlert: boolean; tcrAlert: boolean };
    }).__triggerAlert = (alert) => {
      const key = `${alert.id}-${alert.type}`;
      triggeredRef.current.add(key);
      prevAlertRef.current.add(key);
      setAlertUsers(prev => [...prev.filter(u => !(u.id === alert.id && u.type === alert.type)), alert]);
      setShowBanner(true);
      playSound();
      const now = Date.now();
      soundEndRef.current = now + SOUND_DURATION;
      visualEndRef.current = now + VISUAL_DURATION;
    };
    
    (window as unknown as { __clearAlert?: () => void }).__clearAlert = () => {
      triggeredRef.current.clear();
      prevAlertRef.current.clear();
      setShowBanner(false);
      setAlertUsers([]);
      soundEndRef.current = 0;
      visualEndRef.current = 0;
    };

    // 同步状态
    const syncInterval = setInterval(() => {
      (window as unknown as { __globalAlert?: { show: boolean; users: AlertUser[]; hrAlert: boolean; tcrAlert: boolean } }).__globalAlert = {
        show: showBanner,
        users: alertUsers,
        hrAlert: alertUsers.some(u => u.type === 'hr'),
        tcrAlert: alertUsers.some(u => u.type === 'tcr')
      };
    }, 1000);
    return () => clearInterval(syncInterval);
  }, [showBanner, alertUsers, playSound]);

  if (!showBanner || alertUsers.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg">实时报警</span>
          </div>
          
          <div className="flex-1 mx-6">
            <div className="flex flex-wrap gap-4">
              {alertUsers.map(user => (
                <div 
                  key={`${user.id}-${user.type}`}
                  className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2"
                >
                  <span className="font-medium">{user.username}</span>
                  <span className="text-white/80">|</span>
                  <span className="font-bold">
                    {user.type === 'hr' ? (
                      <>心率 {user.value} bpm</>
                    ) : (
                      <>核心体温 {user.value.toFixed(1)}°C</>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
