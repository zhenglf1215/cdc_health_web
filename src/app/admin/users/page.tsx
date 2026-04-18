"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, Mail, Calendar, Heart, Thermometer, Activity, Zap, AlertTriangle, Phone, Bug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getCurrentUser, type UserInfo } from "@/lib/auth";

interface UserProfile {
  id: string;
  username: string;
  role?: string;
  company?: string;
  created_at: string;
  last_login?: string;
  avatar_url?: string;
}

interface ChartDataPoint {
  time: string;
  value: number;
}

interface AlertUser {
  id: string;
  username: string;
  type: 'hr' | 'tcr';
  value: number;
}

const PHONE_MAP: Record<string, string> = {
  'user1': '13812345678', 'user2': '13923456789', 'user3': '13734567890', 'user4': '13645678901'
};

const TABS = [
  { key: "hr", label: "心率 HR", color: "#ef4444", unit: "bpm" },
  { key: "tcr", label: "核心温度 Tcr", color: "#f97316", unit: "°C" },
  { key: "tsk", label: "皮肤温度 Tsk", color: "#22c55e", unit: "°C" },
  { key: "mi", label: "劳动代谢率 Mi", color: "#a855f7", unit: "" },
];

const Y_DOMAIN: Record<string, [number, number]> = {
  hr: [40, 120], tcr: [35, 38], tsk: [30, 38], mi: [0, 200]
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [vitalData, setVitalData] = useState<Record<string, ChartDataPoint[]>>({});
  const [loading, setLoading] = useState(false);
  // 获取北京时间的日期字符串
  const getBeijingDate = () => {
    const now = new Date();
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + beijingOffset);
    const year = beijingDate.getFullYear();
    const month = String(beijingDate.getMonth() + 1).padStart(2, '0');
    const day = String(beijingDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getBeijingDate());
  const [activeTab, setActiveTab] = useState("hr");
  const [debugMode, setDebugMode] = useState(false);
  const [debugUser, setDebugUser] = useState("");
  const [alerts, setAlerts] = useState<AlertUser[]>([]);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // 监听全局报警
  useEffect(() => {
    const check = () => {
      const global = (window as unknown as { __globalAlert?: { users: AlertUser[] } }).__globalAlert;
      if (global) setAlerts(global.users);
    };
    check();
    const i = setInterval(check, 500);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role === 'admin') {
      fetch(`/api/users?user_id=${user.id}&user_role=${user.role}`)
        .then(r => r.json())
        .then(async (d) => {
          if (d.success) {
            const applicants = d.users.filter((u: UserProfile) => u.role === "applicant");
            // 加载每个用户的头像
            const usersWithAvatars = await Promise.all(
              applicants.map(async (u: UserProfile) => {
                try {
                  const res = await fetch(`/api/profile?user_id=${u.id}`);
                  const result = await res.json();
                  let avatarUrl = result.data?.avatar_url || '';
                  if (avatarUrl && !avatarUrl.startsWith('data:') && !avatarUrl.startsWith('http')) {
                    avatarUrl = '/' + avatarUrl;
                  }
                  return { ...u, avatar_url: avatarUrl };
                } catch {
                  return { ...u, avatar_url: '' };
                }
              })
            );
            setUsers(usersWithAvatars);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  // 计算Mi
  const calculateMi = useCallback((hr: number, age: number, weight: number, restingHr: number) => {
    const mi = 65 + ((hr - restingHr) / Math.max(1, 180 - 0.65 * age - restingHr)) * ((41.7 - 0.22 * age) * Math.pow(weight, 2/3) - 65);
    return Math.max(0, Math.min(600, mi));
  }, []);

  // 根据Mi递推计算Tcr
  const calculateTcr = useCallback((mi: number, prevTcr: number) => {
    // Tcr(t+1) = Tcr(t) + 0.0036 × (Mi - 55) × 0.0952
    return Math.max(35, Math.min(40, prevTcr + 0.0036 * (mi - 55) * 0.0952));
  }, []);

  // 获取数据
  const fetchData = useCallback(async (userId: string, d: string) => {
    setLoading(true);
    try {
      const [profileRes, hrRes] = await Promise.all([
        fetch(`/api/profile?user_id=${userId}`),
        fetch(`/api/heart-rate/history?userId=${userId}&timeRange=date:${d}`)
      ]);

      let profile: { birth_date?: string; weight?: number; resting_hr?: number } = { resting_hr: 65 };
      const pd = await profileRes.json();
      if (pd.data) profile = pd.data;

      const hd = await hrRes.json();
      if (hd.success && hd.data) {
        // 过滤HR数据并按时间排序
        const hrRecords = hd.data
          .filter((r: { data_type: string }) => r.data_type === 'hr')
          .sort((a: { recorded_at: string }, b: { recorded_at: string }) => 
            new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
          );

        if (hrRecords.length > 0) {
          const age = profile.birth_date ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 30;
          const weight = profile.weight || 65;
          const restingHr = profile.resting_hr || 65;

          // 先计算所有Mi值
          const miValues: number[] = hrRecords.map((record: { value: string }) => {
            const hr = parseFloat(record.value);
            return calculateMi(hr, age, weight, restingHr);
          });

          // 递推计算Tcr
          let currentTcr = 36.8;
          const tcrValues: number[] = [currentTcr];
          miValues.forEach((mi, index) => {
            if (index > 0) {
              currentTcr = calculateTcr(miValues[index - 1], currentTcr);
              tcrValues.push(currentTcr);
            }
          });

          const hrData: ChartDataPoint[] = hrRecords.map((record: { recorded_at: string; value: string }, index: number) => ({
            time: new Date(record.recorded_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            value: parseFloat(record.value)
          }));

          const tcrData: ChartDataPoint[] = hrRecords.map((record: { recorded_at: string }, index: number) => ({
            time: new Date(record.recorded_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            value: Math.round(tcrValues[index] * 100) / 100
          }));

          const miData: ChartDataPoint[] = hrRecords.map((record: { recorded_at: string }, index: number) => ({
            time: new Date(record.recorded_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            value: Math.round(miValues[index] * 100) / 100
          }));

          const tskRecords = hd.data
            .filter((r: { data_type: string }) => r.data_type === 'tsk')
            .sort((a: { recorded_at: string }, b: { recorded_at: string }) => 
              new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
            );
          const tskData: ChartDataPoint[] = tskRecords.map((r: { recorded_at: string; value: string }) => ({
            time: new Date(r.recorded_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            value: parseFloat(r.value)
          }));

          setVitalData({ hr: hrData, tcr: tcrData, tsk: tskData, mi: miData });
        } else {
          setVitalData({ hr: [], tcr: [], tsk: [], mi: [] });
        }
      } else {
        setVitalData({ hr: [], tcr: [], tsk: [], mi: [] });
      }
    } catch (e) {
      console.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [calculateMi, calculateTcr]);

  // 打开弹窗 - 启动实时同步
  const openModal = (user: UserProfile) => {
    setSelectedUser(user);
    setShowModal(true);
    setActiveTab("hr");
    fetchData(user.id, date);
    
    // 启动每5秒轮询
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (selectedUser) fetchData(selectedUser.id, date);
    }, 5000);
  };

  // 关闭弹窗 - 停止轮询
  const closeModal = () => {
    setShowModal(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // 日期变化
  const onDateChange = (d: string) => {
    setDate(d);
    if (selectedUser) fetchData(selectedUser.id, d);
  };

  // 调试
  const triggerAlert = (type: 'hr' | 'tcr') => {
    if (!debugUser) { alert('请选择用户'); return; }
    const user = users.find(u => u.id === debugUser);
    if (user) {
      (window as unknown as { __triggerAlert?: (a: AlertUser) => void }).__triggerAlert?.({
        id: user.id, username: user.username, type, value: type === 'hr' ? 185 : 38.5
      });
    }
  };

  const clearAlert = () => {
    (window as unknown as { __clearAlert?: () => void }).__clearAlert?.();
  };

  const isUserAlert = (id: string) => alerts.some(u => u.id === id);
  const hasHrAlert = alerts.some(u => u.type === 'hr');
  const hasTcrAlert = alerts.some(u => u.type === 'tcr');
  const filtered = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统中的所有应用者</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex items-center gap-1"><Bug className="w-3 h-3" />调试</span>
          <Button onClick={() => setDebugMode(!debugMode)} variant={debugMode ? "default" : "outline"} size="sm" className={debugMode ? "bg-orange-500" : ""}>
            {debugMode ? "关闭" : "开启"}
          </Button>
        </div>
      </div>

      {/* 调试面板 */}
      {debugMode && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-orange-800 mb-3">选择用户 → 触发报警</p>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={debugUser} onValueChange={setDebugUser}>
                <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="选择用户" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={() => triggerAlert('hr')} size="sm" className="bg-red-500 hover:bg-red-600">❤️心率报警</Button>
              <Button onClick={() => triggerAlert('tcr')} size="sm" className="bg-orange-500 hover:bg-orange-600">⚠️高温报警</Button>
              <Button onClick={clearAlert} size="sm" variant="outline">清除</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜索 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="搜索用户..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {/* 用户列表 */}
      <div className="space-y-3">
        {filtered.map(user => {
          const userAlerts = alerts.filter(u => u.id === user.id);
          const alert = isUserAlert(user.id);
          return (
            <Card key={user.id} className={`bg-white hover:shadow-md ${alert ? 'border-2 border-red-500 animate-pulse' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 头像 */}
                    <div className={`w-14 h-14 rounded-full border-2 shadow-lg overflow-hidden ${alert ? 'ring-4 ring-red-400 animate-pulse' : ''} bg-gradient-to-br from-blue-500 to-purple-600`}>
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      {!user.avatar_url && (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold text-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {user.username}
                        {alert && (
                          <div className="flex gap-1">
                            {userAlerts.some(u => u.type === 'tcr') && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">⚠️高温</span>}
                            {userAlerts.some(u => u.type === 'hr') && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse">❤️高心率</span>}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-3">
                        <span className="flex items-center"><Mail className="w-3 h-3 mr-1" />{user.company || 'CDC系统'}</span>
                        <span className="flex items-center"><Phone className="w-3 h-3 mr-1" />{PHONE_MAP[user.username] || '13800000000'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
                    <div className="text-center"><div className="text-xs text-gray-400">注册时间</div><div className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(user.created_at).toLocaleDateString('zh-CN')}</div></div>
                    <div className="text-center"><div className="text-xs text-gray-400">最后登录</div>{user.last_login ? new Date(user.last_login).toLocaleDateString('zh-CN') : '未登录'}</div>
                  </div>
                  <Button onClick={() => openModal(user)} className={`${alert ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-blue-500 to-cyan-500'} text-white`}>
                    <Activity className="w-4 h-4 mr-2" />生命体征
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-gray-500"><User className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>没有找到匹配的应用者</p></div>}
      </div>

      {/* 生命体征弹窗 */}
      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
                {selectedUser?.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser?.username} className="w-full h-full object-cover" onError={(e) => {(e.target as HTMLImageElement).style.display='none'}} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-sm">{selectedUser?.username?.charAt(0).toUpperCase()}</div>
                )}
              </div>
              {selectedUser?.username} - 生命体征数据
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {/* 选项卡 */}
              <div className="flex gap-2 flex-wrap">
                {TABS.map(tab => {
                  const isActive = activeTab === tab.key;
                  const isAlert = (tab.key === 'hr' && hasHrAlert) || (tab.key === 'tcr' && hasTcrAlert);
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${isAlert ? 'text-white animate-pulse' : isActive ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      style={isActive && !isAlert ? { backgroundColor: tab.color } : undefined}>
                      {isAlert ? <AlertTriangle className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                      {isAlert ? (tab.key === 'hr' ? '❤️心率报警' : '⚠️高温报警') : tab.label}
                    </button>
                  );
                })}
              </div>

              {/* 日期选择 - 使用北京时间 */}
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const now = new Date();
                  const beijingOffset = 8 * 60 * 60 * 1000;
                  const beijingNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + beijingOffset);
                  return Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(beijingNow);
                    d.setDate(d.getDate() - i);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    return (
                      <button key={dateStr} onClick={() => onDateChange(dateStr)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${date === dateStr ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {i === 0 ? '今天' : `${i}天前`}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* 图表 */}
              <Card>
                <CardContent className="p-4">
                  {vitalData[activeTab]?.length ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={vitalData[activeTab]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} domain={Y_DOMAIN[activeTab]} />
                          <Tooltip formatter={(v: number) => [`${v.toFixed(1)}${TABS.find(t => t.key === activeTab)?.unit}`, TABS.find(t => t.key === activeTab)?.label]} />
                          <Line type="monotone" dataKey="value"
                            stroke={(activeTab === 'hr' && hasHrAlert) ? '#ea580c' : (activeTab === 'tcr' && hasTcrAlert) ? '#dc2626' : TABS.find(t => t.key === activeTab)?.color}
                            strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      <span className="text-lg">暂无数据</span><span className="text-sm mt-1">每5秒自动刷新</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
