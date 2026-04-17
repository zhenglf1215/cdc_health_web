'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  LogOut,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MapPin,
  Activity,
  Watch
} from 'lucide-react';
import { getCurrentUser, logout, type UserInfo } from '@/lib/auth';

interface PublishedEnvironment {
  id: string;
  name: string;
  company: string;
  created_at: string;
}

interface EnvironmentStat {
  environment: string;
  // HR
  hr_av: number | null;
  hr_ad: number | null;
  hr_sd: number | null;
  hr_cv: number | null;
  hr_skew: number | null;
  hr_count: number | null;
  // TCR
  tcr_av: number | null;
  tcr_ad: number | null;
  tcr_sd: number | null;
  tcr_cv: number | null;
  tcr_skew: number | null;
  tcr_count: number | null;
  // TSK
  tsk_av: number | null;
  tsk_ad: number | null;
  tsk_sd: number | null;
  tsk_cv: number | null;
  tsk_skew: number | null;
  tsk_count: number | null;
}

interface CdcData {
  hr: number;
  tcr: number;
  tsk: number;
}

export default function ApplicantPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<EnvironmentStat[]>([]);
  const [cdcData, setCdcData] = useState<CdcData>({ hr: 0, tcr: 0, tsk: 0 });
  const [dataLoading, setDataLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // 已公布的环境列表
  const [publishedEnvs, setPublishedEnvs] = useState<PublishedEnvironment[]>([]);
  const [envsLoading, setEnvsLoading] = useState(false);

  // 检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      // 使用统一的认证工具
      const userData = getCurrentUser();
      
      if (!userData) {
        window.location.href = '/products';
        return;
      }
      
      if (userData.role !== 'applicant') {
        window.location.href = '/admin';
        return;
      }
      
      setUser(userData);
      
      // 加载数据
      setDataLoading(true);
      try {
        const statsResponse = await fetch(`/api/test-data?user_id=${userData.id}`);
        if (statsResponse.ok) {
          const data = await statsResponse.json();
          setStatsData(data.stats || []);
        }
        const cdcResponse = await fetch(`/api/cdc-calculate?user_id=${userData.id}&perspective=user`);
        if (cdcResponse.ok) {
          const cdcData = await cdcResponse.json();
          setCdcData(cdcData.cdc || { hr: 0, tre: 0, tsk: 0 });
        }
      } catch (error) {
        console.error('加载测试数据失败:', error);
      } finally {
        setDataLoading(false);
      }

      // 加载已公布的环境列表
      setEnvsLoading(true);
      try {
        const response = await fetch(`/api/environments?user_id=${userData.id}`);
        if (response.ok) {
          const data = await response.json();
          setPublishedEnvs(data.data || []);
        }
      } catch (error) {
        console.error('加载环境列表失败:', error);
      } finally {
        setEnvsLoading(false);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // 加载已公布的环境列表
  const loadPublishedEnvs = async (userData: UserInfo) => {
    setEnvsLoading(true);
    try {
      const response = await fetch(`/api/environments?user_id=${userData.id}`);
      if (response.ok) {
        const data = await response.json();
        setPublishedEnvs(data.data || []);
      }
    } catch (error) {
      console.error('加载环境列表失败:', error);
    } finally {
      setEnvsLoading(false);
    }
  };

  const loadTestData = async (userData: UserInfo) => {
    setDataLoading(true);
    try {
      // 获取统计数据
      const statsResponse = await fetch(`/api/test-data?user_id=${userData.id}`);
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStatsData(data.stats || []);
      }

      // 获取CDC数据
      const cdcResponse = await fetch(`/api/cdc-calculate?user_id=${userData.id}&perspective=user`);
      if (cdcResponse.ok) {
        const cdcData = await cdcResponse.json();
        setCdcData(cdcData.cdc || { hr: 0, tre: 0, tsk: 0 });
      }
    } catch (error) {
      console.error('加载测试数据失败:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/products';
  };

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-200 to-blue-300 flex flex-col items-center justify-center">
        {/* Apple风格Loading */}
        <div className="w-20 h-20 mb-6 relative">
          {/* 外圈 */}
          <div className="absolute inset-0 rounded-full border-[3px] border-blue-300/30"></div>
          {/* 渐变旋转圈 */}
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-500 animate-spin" style={{ animationDuration: '1s' }}></div>
          {/* 渐变旋转圈2 */}
          <div className="absolute inset-[6px] rounded-full border-[2px] border-transparent border-r-blue-400/50 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}></div>
          {/* 中心图标 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Database className="w-8 h-8 text-blue-500/80" />
          </div>
        </div>
        
        {/* 文字 */}
        <p className="text-blue-600/80 text-lg font-medium tracking-wide animate-pulse">正在加载数据...</p>
        
        {/* 底部进度点 */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-bounce"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // 格式化数字
  const formatNum = (val: number | null | undefined, decimals: number = 3) => {
    return val != null ? val.toFixed(decimals) : '-';
  };

  return (
    <div className="space-y-6">
      {/* CDC测量入口卡片 */}
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
        onClick={() => window.location.href = '/applicant/cdc-measure'}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Watch className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">CDC测量</h3>
                <p className="text-purple-100 text-sm mt-1">通过智能穿戴设备实时监测体温和心率</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-white/70" />
          </div>
        </CardContent>
      </Card>

      {/* 主内容区 */}
      <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  可参与的环境
                </CardTitle>
                <CardDescription>以下是由管理者公布的环境，您可以选择上传数据</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => user && loadPublishedEnvs(user)}
                disabled={envsLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${envsLoading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {envsLoading ? (
              <div className="text-center py-4 text-gray-500">加载中...</div>
            ) : publishedEnvs.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p>暂无可参与的环境</p>
                <p className="text-sm mt-1">请联系管理者公布环境</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {publishedEnvs.map((env) => (
                  <Badge 
                    key={env.id} 
                    variant="secondary"
                    className="px-4 py-2 text-sm bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {env.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 检测数据卡片 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  检测数据
                </CardTitle>
                <CardDescription>
                  企业：{user.company} | 已参与 {statsData.length} 个环境测试
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => user && loadTestData(user)}>
                <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">加载数据中...</p>
              </div>
            ) : statsData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Database className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p>暂无测试数据</p>
                <p className="text-sm mt-2">请前往&ldquo;生命体征&rdquo;页面上传核心温度和皮肤温度数据</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* HR数据表 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">HR数据 (心率)</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left font-medium text-gray-700 border-b">环境</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">AV</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">AD</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">SD</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">CV</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">SKEW</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">采样点数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.map((row, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 font-medium border-b">{row.environment}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.hr_av)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.hr_ad)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.hr_sd)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.hr_cv)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.hr_skew)}</td>
                            <td className="px-6 py-4 text-center border-b">{row.hr_count || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TRE数据表 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Tcr数据 (核心温度)</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left font-medium text-gray-700 border-b">环境</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">AV</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">AD</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">SD</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">CV</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">SKEW</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">采样点数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.map((row, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 font-medium border-b">{row.environment}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tcr_av)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tcr_ad)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tcr_sd)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tcr_cv)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tcr_skew)}</td>
                            <td className="px-6 py-4 text-center border-b">{row.tcr_count || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TSK数据表 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">TSK数据 (皮肤温度)</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left font-medium text-gray-700 border-b">环境</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">AV</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">AD</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">SD</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">CV</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">SKEW</th>
                          <th className="px-6 py-3 text-center font-medium text-gray-700 border-b">采样点数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.map((row, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 font-medium border-b">{row.environment}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tsk_av)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tsk_ad)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tsk_sd)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tsk_cv)}</td>
                            <td className="px-6 py-4 text-center border-b">{formatNum(row.tsk_skew)}</td>
                            <td className="px-6 py-4 text-center border-b">{row.tsk_count || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CDC数据表 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">CDC数据</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-purple-600 text-white">
                          <th className="px-6 py-3 text-left font-medium border border-purple-700">参与环境</th>
                          <th className="px-6 py-3 text-center font-medium border border-purple-700">cdc-hr</th>
                          <th className="px-6 py-3 text-center font-medium border border-purple-700">cdc-tre</th>
                          <th className="px-6 py-3 text-center font-medium border border-purple-700">cdc-tsk</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr 
                          className="bg-blue-50 cursor-pointer hover:bg-blue-100" 
                          onClick={() => toggleRow('environments')}
                        >
                          <td className="px-6 py-4 font-medium border border-gray-200">
                            <span className="flex items-center gap-2">
                              {expandedRows.has('environments') ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                              共 {statsData.length} 个环境
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center border border-gray-200 font-semibold text-blue-600">
                            {statsData.length >= 2 ? (cdcData.hr != null ? cdcData.hr.toFixed(3) : '-') : '需≥2环境'}
                          </td>
                          <td className="px-6 py-4 text-center border border-gray-200 font-semibold text-blue-600">
                            {statsData.length >= 2 ? (cdcData.tcr != null ? cdcData.tcr.toFixed(3) : '-') : '需≥2环境'}
                          </td>
                          <td className="px-6 py-4 text-center border border-gray-200 font-semibold text-blue-600">
                            {statsData.length >= 2 ? (cdcData.tsk != null ? cdcData.tsk.toFixed(3) : '-') : '需≥2环境'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {expandedRows.has('environments') && statsData.length > 0 && (
                      <div className="px-6 py-3 bg-gray-50 border-t">
                        <span className="text-gray-600">
                          {statsData.map(r => r.environment).join('、')}
                        </span>
                      </div>
                    )}
                  </div>
                  {statsData.length < 2 && (
                    <p className="text-sm text-gray-500 mt-2">
                      * CDC计算需要至少2个环境的数据
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
