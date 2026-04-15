'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronRight,
  Play,
  Pause,
  Square,
  Clock,
  Thermometer,
  Heart,
  ThermometerSun,
  Upload,
  Bluetooth,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  FileText,
  X,
  Activity
} from 'lucide-react';
import { getCurrentUser, type UserInfo } from '@/lib/auth';

type Step = 'environment' | 'upload' | 'measuring';
type UploadMode = 'bluetooth' | 'file';
type DataType = 'tcr' | 'tsk' | 'hr';

interface PublishedEnvironment {
  id: string;
  name: string;
  company: string;
  created_at: string;
}

interface RealtimeData {
  type: DataType;
  value: number;
  timestamp: number;
}

export default function CDCMeasurePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>('environment');
  const router = useRouter();

  // 环境选择
  const [environments, setEnvironments] = useState<PublishedEnvironment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<PublishedEnvironment | null>(null);
  const [envsLoading, setEnvsLoading] = useState(false);

  // 上传方式
  const [uploadMode, setUploadMode] = useState<UploadMode>('bluetooth');
  const [showBluetoothHint, setShowBluetoothHint] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{tcr: number[], tsk: number[], hr: number[]} | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // 测量状态
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [vitalRecords, setVitalRecords] = useState<RealtimeData[]>([]);
  const [latestValues, setLatestValues] = useState<{tcr: number; tsk: number; hr: number}>({
    tcr: 0,
    tsk: 0,
    hr: 0
  });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dataUploadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const userData = getCurrentUser();
      
      if (!userData) {
        router.push('/products');
        return;
      }
      
      if (userData.role !== 'applicant') {
        router.push('/admin');
        return;
      }
      
      setUser(userData);
      loadEnvironments(userData.id);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadEnvironments = async (userId: string) => {
    setEnvsLoading(true);
    try {
      const response = await fetch(`/api/environments?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setEnvironments(data.data || []);
      }
    } catch (error) {
      console.error('加载环境列表失败:', error);
    } finally {
      setEnvsLoading(false);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 模拟实时数据生成（实际应该从蓝牙设备获取）
  const generateSimulatedData = useCallback((): RealtimeData[] => {
    return [
      { type: 'tcr', value: parseFloat((36.5 + Math.random() * 0.8).toFixed(1)), timestamp: Date.now() },
      { type: 'tsk', value: parseFloat((33 + Math.random() * 2).toFixed(1)), timestamp: Date.now() },
      { type: 'hr', value: Math.floor(70 + Math.random() * 20), timestamp: Date.now() }
    ];
  }, []);

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setFileUploading(true);

    // 验证文件类型
    const validTypes = ['.csv', '.json', '.xlsx', '.xls'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      setFileError('请上传 CSV、JSON 或 Excel 文件');
      setFileUploading(false);
      return;
    }

    setUploadedFile(file);

    try {
      // 读取文件内容
      const text = await file.text();
      let parsedData: {tcr: number[], tsk: number[], hr: number[]} = { tcr: [], tsk: [], hr: [] };

      if (fileExt === '.json') {
        // JSON格式：期望格式 { "tcr": [...], "tsk": [...], "hr": [...] }
        const jsonData = JSON.parse(text);
        parsedData = {
          tcr: Array.isArray(jsonData.tcr) ? jsonData.tcr : [],
          tsk: Array.isArray(jsonData.tsk) ? jsonData.tsk : [],
          hr: Array.isArray(jsonData.hr) ? jsonData.hr : []
        };
      } else if (fileExt === '.csv') {
        // CSV格式：第一列类型，后面是数据值
        const lines = text.trim().split('\n');
        const headers = lines[0].toLowerCase().split(',');

        const tcrIdx = headers.findIndex(h => h.includes('tcr') || h.includes('tre') || h.includes('core'));
        const tskIdx = headers.findIndex(h => h.includes('tsk') || h.includes('skin'));
        const hrIdx = headers.findIndex(h => h.includes('hr') || h.includes('heart'));

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (tcrIdx >= 0 && values[tcrIdx]) parsedData.tcr.push(parseFloat(values[tcrIdx]));
          if (tskIdx >= 0 && values[tskIdx]) parsedData.tsk.push(parseFloat(values[tskIdx]));
          if (hrIdx >= 0 && values[hrIdx]) parsedData.hr.push(parseFloat(values[hrIdx]));
        }
      } else {
        setFileError('Excel文件暂不支持，请使用CSV或JSON格式');
        setFileUploading(false);
        return;
      }

      // 检查是否有数据
      const totalData = parsedData.tcr.length + parsedData.tsk.length + parsedData.hr.length;
      if (totalData === 0) {
        setFileError('文件中未找到有效的体温或心率数据');
        setFileUploading(false);
        return;
      }

      setFilePreview(parsedData);
    } catch (error) {
      console.error('解析文件失败:', error);
      setFileError('解析文件失败，请检查文件格式');
    } finally {
      setFileUploading(false);
    }
  };

  // 从文件数据开始测量
  const startFromFile = async () => {
    if (!filePreview || !selectedEnv || !user) return;

    try {
      // 1. 开始CDC测量会话
      const startResponse = await fetch('/api/cdc-measure/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          environmentId: selectedEnv.id,
          environmentName: selectedEnv.name
        })
      });

      if (!startResponse.ok) {
        throw new Error('创建测量会话失败');
      }

      const startData = await startResponse.json();
      const sessionId = startData.sessionId;

      // 2. 上传文件数据
      const now = Date.now();
      const allData: RealtimeData[] = [];

      filePreview.tcr.forEach((value, index) => {
        allData.push({ type: 'tcr', value, timestamp: now + index * 60000 });
      });
      filePreview.tsk.forEach((value, index) => {
        allData.push({ type: 'tsk', value, timestamp: now + index * 60000 });
      });
      filePreview.hr.forEach((value, index) => {
        allData.push({ type: 'hr', value, timestamp: now + index * 60000 });
      });

      const dataResponse = await fetch('/api/cdc-measure/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          userId: user.id,
          environmentId: selectedEnv.id,
          environmentName: selectedEnv.name,
          data: allData
        })
      });

      if (!dataResponse.ok) {
        throw new Error('上传数据失败');
      }

      // 3. 结束CDC测量会话（这会自动计算统计数据并存入user_environment_stats）
      const stopResponse = await fetch('/api/cdc-measure/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          userId: user.id,
          environmentId: selectedEnv.id,
          environmentName: selectedEnv.name
        })
      });

      const stopData = await stopResponse.json();

      if (stopData.success) {
        alert(`数据导入成功！\n\nTcr CDC: ${stopData.cdc?.tre?.toFixed(4) || 'N/A'}\nTsk CDC: ${stopData.cdc?.tsk?.toFixed(4) || 'N/A'}\nHR CDC: ${stopData.cdc?.hr?.toFixed(4) || 'N/A'}`);
        router.push('/applicant');
      } else {
        alert('数据已上传，CDC计算待完成');
        router.push('/applicant');
      }
    } catch (error) {
      console.error('导入数据失败:', error);
      alert('导入数据失败，请重试');
    }
  };

  // 开始CDC测量
  const startMeasurement = async () => {
    if (!selectedEnv || !user) return;

    try {
      const response = await fetch('/api/cdc-measure/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          environmentId: selectedEnv.id,
          environmentName: selectedEnv.name
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        setStartTime(Date.now());
        setIsMeasuring(true);
        setCurrentStep('measuring');
        setElapsedTime(0);
        setVitalRecords([]);

        // 启动计时器
        timerRef.current = setInterval(() => {
          setElapsedTime(prev => prev + 1);
        }, 1000);

        // 模拟实时数据上传（每分钟上传一次，实际设备应该是持续采集）
        // 为了演示，这里每5秒模拟一次数据
        dataUploadIntervalRef.current = setInterval(async () => {
          const simulatedData = generateSimulatedData();
          setVitalRecords(prev => [...prev, ...simulatedData]);
          
          // 更新最新值
          simulatedData.forEach(item => {
            setLatestValues(prev => ({ ...prev, [item.type]: item.value }));
          });

          // 上传到服务器
          await uploadDataToServer(simulatedData);
        }, 5000); // 每5秒模拟一次数据，实际应该是每1分钟

      }
    } catch (error) {
      console.error('开始测量失败:', error);
      alert('开始测量失败，请重试');
    }
  };

  // 上传生命体征数据
  const uploadDataToServer = async (data: RealtimeData[]) => {
    if (!sessionId || !user || !selectedEnv) return;

    try {
      await fetch('/api/cdc-measure/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: user.id,
          environmentId: selectedEnv.id,
          environmentName: selectedEnv.name,
          data
        })
      });
    } catch (error) {
      console.error('上传数据失败:', error);
    }
  };

  // 停止CDC测量
  const stopMeasurement = async () => {
    if (!sessionId) return;

    // 停止计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 停止数据采集
    if (dataUploadIntervalRef.current) {
      clearInterval(dataUploadIntervalRef.current);
      dataUploadIntervalRef.current = null;
    }

    // 结束CDC测量会话
    try {
      const response = await fetch('/api/cdc-measure/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          endTime: Date.now()
        })
      });

      const result = await response.json();

      setIsMeasuring(false);
      
      // 显示完成信息
      alert(`CDC测量完成！\n时长：${formatTime(elapsedTime)}\n数据点数：${vitalRecords.length}\nCDC值：HR=${result.cdc?.hr?.toFixed(4) || 0}, Tre=${result.cdc?.tre?.toFixed(4) || 0}, Tsk=${result.cdc?.tsk?.toFixed(4) || 0}`);
      
      // 返回选择环境页面
      setCurrentStep('environment');
      setSelectedEnv(null);
      setSessionId(null);
      setStartTime(null);
      setElapsedTime(0);
      setVitalRecords([]);
      setLatestValues({ tcr: 0, tsk: 0, hr: 0 });

    } catch (error) {
      console.error('停止测量失败:', error);
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (dataUploadIntervalRef.current) clearInterval(dataUploadIntervalRef.current);
    };
  }, []);

  const handleBluetoothClick = () => {
    setShowBluetoothHint(true);
    setTimeout(() => setShowBluetoothHint(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200 pb-20">
      {/* 顶部导航栏 */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3">
              <Link 
                href="/applicant/cdc-measure"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900">CDC数据</h1>
              </div>
            </div>
            {currentStep !== 'environment' && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                步骤 {currentStep === 'upload' ? '2' : '3'}/3
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* 步骤指示器 */}
      {currentStep !== 'measuring' && (
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white`}>
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">选择环境</span>
            </div>
            <div className="flex-1 h-0.5 bg-blue-300 mx-4"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">上传方式</span>
            </div>
            <div className="flex-1 h-0.5 bg-blue-300 mx-4"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-500">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-gray-400">
                测量
              </span>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4">
        
        {/* 步骤1：选择环境 */}
        {currentStep === 'environment' && (
          <Card className="bg-white/80 backdrop-blur-xl border-white/30 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ChevronRight className="w-5 h-5 mr-2 text-blue-600" />
                选择CDC测量环境
              </CardTitle>
            </CardHeader>
            <CardContent>
              {envsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500">加载环境中...</p>
                </div>
              ) : environments.length === 0 ? (
                <div className="text-center py-8">
                  <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无可用环境</p>
                  <p className="text-sm text-gray-400 mt-2">请联系管理员公布环境</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {environments.map((env) => (
                    <button
                      key={env.id}
                      onClick={() => setSelectedEnv(env)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        selectedEnv?.id === env.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{env.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{env.company}</p>
                        </div>
                        {selectedEnv?.id === env.id && (
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <Button
                  onClick={() => selectedEnv && setCurrentStep('upload')}
                  disabled={!selectedEnv}
                  className="w-full bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600"
                  size="lg"
                >
                  下一步：选择数据上传方式
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步骤2：选择上传方式 */}
        {currentStep === 'upload' && (
          <Card className="bg-white/80 backdrop-blur-xl border-white/30 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ChevronRight className="w-5 h-5 mr-2 text-blue-600" />
                选择数据上传方式
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 蓝牙设备 */}
                <button
                  onClick={() => setUploadMode('bluetooth')}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    uploadMode === 'bluetooth'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                      uploadMode === 'bluetooth' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Bluetooth className={`w-6 h-6 ${uploadMode === 'bluetooth' ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">蓝牙智能设备</h3>
                      <p className="text-sm text-gray-500">连接穿戴设备自动采集数据</p>
                    </div>
                    {uploadMode === 'bluetooth' && (
                      <CheckCircle className="w-6 h-6 text-blue-600 ml-auto" />
                    )}
                  </div>
                </button>

                {/* 文件上传 */}
                <button
                  onClick={() => {
                    setUploadMode('file');
                    setShowBluetoothHint(false);
                  }}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    uploadMode === 'file'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                      uploadMode === 'file' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Upload className={`w-6 h-6 ${uploadMode === 'file' ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">历史数据导入</h3>
                      <p className="text-sm text-gray-500">上传已采集的CSV/JSON/Excel文件</p>
                    </div>
                    {uploadMode === 'file' && (
                      <CheckCircle className="w-6 h-6 text-blue-600 ml-auto" />
                    )}
                  </div>
                </button>

                {/* 文件上传界面 */}
                {uploadMode === 'file' && (
                  <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                    {uploadedFile ? (
                      <div className="space-y-3">
                        <div className="flex items-center p-3 bg-white rounded-lg border">
                          <FileText className="w-8 h-8 text-blue-600 mr-3" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button onClick={() => { setUploadedFile(null); setFilePreview(null); }} className="p-1 hover:bg-gray-100 rounded">
                            <X className="w-5 h-5 text-gray-400" />
                          </button>
                        </div>

                        {filePreview && (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-700 mb-2">数据预览：</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center p-2 bg-white rounded">
                                <p className="text-gray-500">核心温度 Tcr</p>
                                <p className="font-bold text-orange-600">{filePreview.tcr.length} 条</p>
                              </div>
                              <div className="text-center p-2 bg-white rounded">
                                <p className="text-gray-500">皮肤温度 Tsk</p>
                                <p className="font-bold text-green-600">{filePreview.tsk.length} 条</p>
                              </div>
                              <div className="text-center p-2 bg-white rounded">
                                <p className="text-gray-500">心率 HR</p>
                                <p className="font-bold text-red-600">{filePreview.hr.length} 条</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {fileError && (
                          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            {fileError}
                          </div>
                        )}

                        <Button
                          onClick={startFromFile}
                          disabled={!filePreview || fileUploading}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {fileUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              导入中...
                            </>
                          ) : (
                            '确认导入数据'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          accept=".csv,.json,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="p-6 border-2 border-dashed border-blue-300 rounded-lg text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
                          {fileUploading ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-2" />
                              <span className="text-blue-600">解析中...</span>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 mx-auto text-blue-400 mb-2" />
                              <p className="text-blue-600 font-medium">点击选择文件</p>
                              <p className="text-xs text-gray-500 mt-1">支持 CSV、JSON 格式</p>
                            </>
                          )}
                        </div>
                      </label>
                    )}
                  </div>
                )}

                {showBluetoothHint && (
                  <div className="p-3 bg-orange-50 text-orange-700 rounded-lg text-sm">
                    蓝牙功能正在开发中，建议使用历史数据导入方式
                  </div>
                )}

                {/* 已选环境 */}
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <ChevronRight className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">测量环境</p>
                      <p className="font-medium text-blue-700">{selectedEnv?.name}</p>
                    </div>
                    <button 
                      onClick={() => setCurrentStep('environment')}
                      className="ml-auto text-sm text-blue-600 hover:underline"
                    >
                      修改
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('environment')}
                  className="flex-1"
                >
                  返回
                </Button>
                <Button
                  onClick={startMeasurement}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  开始测量
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步骤3：测量中 */}
        {currentStep === 'measuring' && (
          <div className="space-y-4">
            {/* 测量状态卡片 */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
                    isMeasuring ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {isMeasuring ? (
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <Pause className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold mt-4 text-gray-900">
                    {isMeasuring ? '测量进行中' : '测量已暂停'}
                  </h2>
                  <div className="flex items-center justify-center mt-2 text-gray-500">
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="text-3xl font-mono">{formatTime(elapsedTime)}</span>
                  </div>
                </div>

                {/* 环境信息 */}
                <div className="p-3 bg-blue-50 rounded-lg mb-4">
                  <p className="text-sm text-blue-600">
                    <span className="font-medium">测量环境：</span>{selectedEnv?.name}
                  </p>
                </div>

                {/* 控制按钮 */}
                <div className="flex gap-3">
                  {!isMeasuring ? (
                    <Button
                      onClick={() => setIsMeasuring(true)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      继续测量
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setIsMeasuring(false)}
                      className="flex-1"
                      size="lg"
                    >
                      <Pause className="w-5 h-5 mr-2" />
                      暂停
                    </Button>
                  )}
                  <Button
                    onClick={stopMeasurement}
                    variant="destructive"
                    size="lg"
                    className="flex-1"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    结束测量
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 实时数据展示 */}
            <div className="grid grid-cols-3 gap-3">
              {/* Tre */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Thermometer className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">核心温度</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {latestValues.tcr > 0 ? `${latestValues.tcr}°` : '--'}
                  </p>
                </CardContent>
              </Card>

              {/* Tsk */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ThermometerSun className="w-5 h-5 text-teal-600" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">皮肤温度</p>
                  <p className="text-2xl font-bold text-teal-600">
                    {latestValues.tsk > 0 ? `${latestValues.tsk}°` : '--'}
                  </p>
                </CardContent>
              </Card>

              {/* HR */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Heart className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">心率</p>
                  <p className="text-2xl font-bold text-red-600">
                    {latestValues.hr > 0 ? latestValues.hr : '--'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 数据统计 */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">数据采集统计</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">已采集数据点</span>
                    <span className="font-medium">{vitalRecords.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">上传状态</span>
                    <Badge className="bg-green-100 text-green-700">已上传</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 提示 */}
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-700">
                <strong>测量提示：</strong>测量期间请保持设备连接，数据将每分钟自动上传。测量完成后数据将自动参与CDC计算。
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
