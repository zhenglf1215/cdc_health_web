'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play,
  Square,
  Clock,
  Bluetooth,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  MapPin,
  Thermometer,
  Heart,
  ThermometerSun,
  Droplets,
  Wind,
  FileText,
  X,
  ChevronRight
} from 'lucide-react';
import { getCurrentUser, type UserInfo } from '@/lib/auth';

interface WeatherData {
  success: boolean;
  location: string;
  lives?: {
    weather: string;
    temperature: string;
    humidity: string;
    pressure: string;
    winddirection: string;
    windpower: string;
  };
}

interface PublishedEnvironment {
  id: string;
  name: string;
  company: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface UploadedData {
  tcr: { timestamp: string; value: number }[];
  tsk: { timestamp: string; value: number }[];
  hr: { timestamp: string; value: number }[];
}

export default function ApplicantHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== CDC测量状态 =====
  const [environments, setEnvironments] = useState<PublishedEnvironment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<PublishedEnvironment | null>(null);
  const [envsLoading, setEnvsLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'bluetooth' | 'file'>('bluetooth');
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [vitalData, setVitalData] = useState({ tcr: 0, tsk: 0, hr: 0 });
  
  // 蓝牙状态
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  // 文件上传状态
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<UploadedData | null>(null);
  const [fileError, setFileError] = useState('');
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dataIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== 地图状态 =====
  const [mapContainer, setMapContainer] = useState<HTMLElement | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [gpsPosition, setGpsPosition] = useState<{ lng: number; lat: number } | null>(null); // 保存GPS位置
  const mapRef = useRef<any>(null);
  const gpsMarkerRef = useRef<any>(null);

  // ===== 天气状态 =====
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [clickAddress, setClickAddress] = useState('');

  // ===== 地区搜索状态 =====
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // ===== 服装推荐状态 =====
  const [clothingAdvice, setClothingAdvice] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);

  useEffect(() => {
    // 在 AMap SDK 加载前设置安全密钥
    (window as any)._AMapSecurityConfig = {
      securityJsCode: '2b2821be9825aa9ee71a6f9c8d82ccb1',
    };
    
    const userData = getCurrentUser();
    if (!userData) {
      router.push('/products');
      return;
    }
    setUser(userData);
    loadEnvironments(userData.id);
    setLoading(false);
  }, [router]);

  const loadEnvironments = async (userId: string) => {
    setEnvsLoading(true);
    try {
      const res = await fetch(`/api/environments?user_id=${userId}`);
      const data = await res.json();
      if (data.success) setEnvironments(data.data || []);
    } catch (err) {
      console.error('加载环境失败:', err);
    }
    setEnvsLoading(false);
  };

  // 选择环境
  const handleSelectEnvironment = (env: PublishedEnvironment) => {
    setSelectedEnv(env);
    
    // 只有地图发布的环境（有经纬度）才跳转地图
    // 注意：不覆盖gpsPosition，保持用户GPS位置不变
    if (env.latitude && env.longitude && mapRef.current) {
      mapRef.current.setCenter([env.longitude, env.latitude]);
      // GPS按钮仍然可以回到用户位置，不受环境选择影响
    }
    // 普通环境（无经纬度）不跳转地图
  };

  // ===== CDC测量功能 =====
  const handleStartMeasure = () => {
    // 检查蓝牙连接状态
    if (uploadMode === 'bluetooth' && !bluetoothConnected) {
      alert('请先连接蓝牙设备');
      return;
    }
    
    if (!selectedEnv) {
      alert('请先选择测量环境');
      return;
    }
    
    if (uploadMode === 'bluetooth') {
      // 蓝牙模式 - 开始测量
      setIsMeasuring(true);
      setElapsedTime(0);
      
      // 计时器
      timerRef.current = setInterval(() => {
        setElapsedTime(t => t + 1);
      }, 1000);

      // 每分钟记录一次数据
      dataIntervalRef.current = setInterval(async () => {
        const data = {
          tcr: parseFloat((36.5 + Math.random() * 0.5).toFixed(1)),
          tsk: parseFloat((33 + Math.random() * 2).toFixed(1)),
          hr: Math.floor(70 + Math.random() * 15)
        };
        setVitalData(data);
        
        // 上传到服务器（同时上传 Tre、TSK、HR）
        if (user) {
          const timestamp = new Date().toISOString();
          try {
            await fetch('/api/vital-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                company: user.company,
                environmentName: selectedEnv.name,
                tcr: data.tcr,
                tsk: data.tsk,
                hr: data.hr,
                timestamp
              })
            });
            console.log('已记录:', timestamp, data);
          } catch (err) {
            console.error('上传失败:', err);
          }
        }
      }, 60000); // 每60秒记录一次
    } else {
      // 文件模式 - 检查是否有上传数据
      if (!filePreview) {
        alert('请先上传数据文件');
        return;
      }
      // 开始上传数据
      handleUploadData();
    }
  };

  const handleStopMeasure = () => {
    setIsMeasuring(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current);
      dataIntervalRef.current = null;
    }
  };
	
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ===== 蓝牙连接 =====
  const handleConnectBluetooth = () => {
    if (bluetoothConnected) {
      // 已连接，断开
      setBluetoothConnected(false);
      return;
    }
    
    // 模拟蓝牙连接（后续替换为真实蓝牙逻辑）
    setConnecting(true);
    setTimeout(() => {
      setBluetoothConnected(true);
      setConnecting(false);
    }, 1500);
  };

  // ===== 文件上传处理 =====
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setFileError('');
    setFilePreview(null);
    setFileUploading(true);

    try {
      const text = await file.text();
      let data: UploadedData;

      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else {
        throw new Error('不支持的文件格式，请上传 CSV 或 JSON 文件');
      }

      // 验证数据格式
      if (!data.tcr || !data.tsk || !data.hr) {
        throw new Error('数据格式错误，需要包含 tre、tsk、hr 三个字段');
      }

      // 按时间排序
      data.tcr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      data.tsk.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      data.hr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setFilePreview(data);
    } catch (err: any) {
      setFileError(err.message);
      setUploadedFile(null);
    }

    setFileUploading(false);
  };

  const parseCSV = (text: string): UploadedData => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV文件数据不足');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const tcrIdx = headers.findIndex(h => h.includes('tcr') || h.includes('tre') || h.includes('core'));
    const tskIdx = headers.findIndex(h => h.includes('tsk') || h.includes('skin'));
    const hrIdx = headers.findIndex(h => h.includes('hr') || h.includes('heart'));
    const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('date'));

    if (tcrIdx === -1 || tskIdx === -1 || hrIdx === -1) {
      throw new Error('CSV缺少必要列：tcr、tsk、hr');
    }

    const tcr: { timestamp: string; value: number }[] = [];
    const tsk: { timestamp: string; value: number }[] = [];
    const hr: { timestamp: string; value: number }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const timestamp = timeIdx >= 0 ? cols[timeIdx] : new Date(Date.now() - (lines.length - i) * 60000).toISOString();
      
      if (cols[tcrIdx]) tcr.push({ timestamp, value: parseFloat(cols[tcrIdx]) });
      if (cols[tskIdx]) tsk.push({ timestamp, value: parseFloat(cols[tskIdx]) });
      if (cols[hrIdx]) hr.push({ timestamp, value: parseFloat(cols[hrIdx]) });
    }

    return { tcr, tsk, hr };
  };

  // ===== 上传数据到服务器 =====
  const handleUploadData = async () => {
    if (!user || !selectedEnv || !filePreview) return;

    setUploadStatus('uploading');
    setUploadMessage('正在上传数据...');

    try {
      let uploadCount = 0;
      const total = filePreview.hr.length;

      // 每条数据间隔1分钟上传
      for (let i = 0; i < filePreview.hr.length; i++) {
        const timestamp = filePreview.hr[i].timestamp;
        
        // 同时上传 Tre、TSK、HR
        await fetch('/api/vital-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            company: user.company,
            environmentName: selectedEnv.name,
            tcr: filePreview.tcr[i]?.value,
            tsk: filePreview.tsk[i]?.value,
            hr: filePreview.hr[i]?.value,
            timestamp
          })
        });

        uploadCount++;
        setUploadMessage(`上传中... ${uploadCount}/${total}`);
      }

      setUploadStatus('success');
      setUploadMessage(`成功上传 ${total} 条记录`);
    } catch (err: any) {
      setUploadStatus('error');
      setUploadMessage('上传失败: ' + err.message);
    }
  };

  // ===== 地图功能 =====
  const initMap = async (container: HTMLElement) => {
    try {
      const AMapLoader = (await import('@amap/amap-jsapi-loader')).default;
      const AMap = await AMapLoader.load({
        key: 'ddf55d516ff9ec74e260c0d466135ab4',
        version: '2.0',
        plugins: ['AMap.Geocoder', 'AMap.PlaceSearch'],
      });

      // 保存AMap实例供Geocoder使用（不用于搜索）
      const map = new AMap.Map(container, {
        zoom: 12,
        center: [106.531, 29.544],
      });

      mapRef.current = map;

      // 地图移动结束后获取中心点位置的天气
      const updateWeatherByCenter = async () => {
        const center = map.getCenter();
        const lng = center.getLng();
        const lat = center.getLat();

        // 逆地理编码
        const geocoder = new AMap.Geocoder();
        geocoder.getAddress([lng, lat], (status: string, result: any) => {
          setClickAddress(status === 'complete' ? result.regeocode?.formattedAddress : `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        });

        // 获取天气
        try {
          const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
          const weatherData = await res.json();
          setWeather(weatherData);
          fetchClothingAdvice(weatherData);
        } catch {}
      };

      // 监听地图移动结束事件
      map.on('moveend', updateWeatherByCenter);

      // 默认天气
      try {
        const res = await fetch('/api/weather?lat=29.544&lng=106.531');
        const weatherData = await res.json();
        setWeather(weatherData);
        setClickAddress('重庆市');
        fetchClothingAdvice(weatherData);
      } catch {}

      setMapReady(true);
    } catch (err) {
      console.error('地图加载失败:', err);
    }
  };

  const handleMapRef = (el: HTMLElement | null) => {
    if (el && !mapContainer) {
      setMapContainer(el);
      initMap(el);
    }
  };

  // ===== 地区搜索 =====
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      // 使用高德 PlaceSearch
      const AMapLoader = (await import('@amap/amap-jsapi-loader')).default;
      const AMap = await AMapLoader.load({
        key: 'ddf55d516ff9ec74e260c0d466135ab4',
        version: '2.0',
        plugins: ['AMap.PlaceSearch'],
      });
      
      const placeSearch = new AMap.PlaceSearch({
        city: '全国',
        citylimit: false,
        pageSize: 5,
      });
      
      placeSearch.search(searchQuery, (status: string, result: any) => {
        console.log('搜索状态:', status, result);
        if (status === 'complete' && result.poiList && result.poiList.pois) {
          const results = result.poiList.pois.slice(0, 5).map((item: any, index: number) => ({
            id: index,
            name: item.name || '',
            district: item.pname || '',
            address: item.address || '',
            lng: parseFloat(item.location.lng) || 0,
            lat: parseFloat(item.location.lat) || 0,
          })).filter((item: any) => item.lng !== 0);

          setSearchResults(results);
          setShowResults(true);
        } else if (status === 'no_data') {
          console.log('搜索无结果');
          setSearchResults([]);
        } else {
          console.log('搜索失败:', result);
          setSearchResults([]);
        }
        setSearching(false);
      });
    } catch (err) {
      console.error('搜索失败:', err);
      setSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    const lng = result.lng;
    const lat = result.lat;
    
    if (!lng || !lat) {
      console.error('结果没有位置信息');
      return;
    }
    
    // 地图跳转 - 高德地图使用 [lng, lat] 格式
    if (mapRef.current) {
      mapRef.current.setCenter([lng, lat]);
      mapRef.current.setZoom(14);
    }
    
    // 更新地址和天气
    setClickAddress(result.name || result.address);
    setShowResults(false);
    setSearchQuery('');
    
    // 更新天气
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then(res => res.json())
      .then(weatherData => {
        setWeather(weatherData);
        fetchClothingAdvice(weatherData);
      })
      .catch(err => console.error('更新天气失败:', err));
  };

  const handleGetLocation = () => {
    // 如果已有GPS位置，点击按钮回到GPS位置
    if (gpsPosition && mapRef.current) {
      mapRef.current.setCenter([gpsPosition.lng, gpsPosition.lat]);
      mapRef.current.setZoom(15);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('浏览器不支持定位功能');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // 保存GPS位置
        setGpsPosition({ lng, lat });

        if (mapRef.current) {
          mapRef.current.setCenter([lng, lat]);
          mapRef.current.setZoom(15);

          // 添加GPS位置标记
          const AMapLib = (window as any).AMap;
          if (gpsMarkerRef.current) {
            gpsMarkerRef.current.setPosition([lng, lat]);
          } else {
            gpsMarkerRef.current = new AMapLib.Marker({
              position: [lng, lat],
              icon: new AMapLib.Icon({
                size: new AMapLib.Size(32, 32),
                image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png', // 蓝色标记
                imageSize: new AMapLib.Size(32, 32),
              }),
              offset: new AMapLib.Pixel(-16, -32),
              title: '我的位置',
            });
            gpsMarkerRef.current.setMap(mapRef.current);
          }
        }

        setLocationLoading(false);
      },
      (err) => {
        let msg = '定位失败';
        if (err.code === 1) msg = '请允许位置权限';
        else if (err.code === 2) msg = '无法获取位置';
        else if (err.code === 3) msg = '定位超时';
        setLocationError(msg);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ===== 获取服装推荐 =====
  const fetchClothingAdvice = async (weatherData: WeatherData) => {
    if (!weatherData?.lives) return;
    
    setAdviceLoading(true);
    setClothingAdvice('');
    
    try {
      const res = await fetch('/api/clothing-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weather: {
            location: clickAddress || weatherData.location || '当前位置',
            weather: weatherData.lives.weather,
            temperature: parseFloat(weatherData.lives.temperature),
            humidity: parseInt(weatherData.lives.humidity),
            windSpeed: parseInt(weatherData.lives.windpower)
          }
        })
      });
      
      if (!res.ok) throw new Error('请求失败');
      
      // 流式读取
      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应');
      
      const decoder = new TextDecoder();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setClothingAdvice(result);
      }
    } catch (err) {
      console.error('获取服装建议失败:', err);
      setClothingAdvice('暂时无法获取穿衣建议，请稍后重试');
    }
    setAdviceLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">首页</h1>
        <p className="text-gray-500 mt-1">CDC健康检测系统</p>
      </div>

      {/* ===== CDC测量区域 ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600" />
            CDC测量
            {/* 蓝牙状态指示 */}
            <Badge variant={bluetoothConnected ? 'default' : 'outline'} className={`ml-2 ${bluetoothConnected ? 'bg-green-600' : ''}`}>
              <Bluetooth className="w-3 h-3 mr-1" />
              {connecting ? '连接中...' : bluetoothConnected ? '已连接' : '未连接'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 环境选择 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">选择测量环境</label>
            {envsLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>加载中...</span>
              </div>
            ) : environments.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无可用环境</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {environments.map(env => (
                  <button
                    key={env.id}
                    onClick={() => handleSelectEnvironment(env)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedEnv?.id === env.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4 mr-1 inline" />
                    {env.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 上传方式 */}
          <div className="flex gap-2">
            <Button
              variant={uploadMode === 'bluetooth' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('bluetooth')}
            >
              <Bluetooth className="w-4 h-4 mr-2" />
              蓝牙上传
            </Button>
            <Button
              variant={uploadMode === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('file')}
            >
              <Upload className="w-4 h-4 mr-2" />
              文件上传
            </Button>
            {/* 蓝牙连接按钮 */}
            {uploadMode === 'bluetooth' && (
              <Button
                variant={bluetoothConnected ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleConnectBluetooth}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : bluetoothConnected ? (
                  <XCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Bluetooth className="w-4 h-4 mr-2" />
                )}
                {bluetoothConnected ? '断开连接' : '连接设备'}
              </Button>
            )}
          </div>

          {/* 文件上传界面 */}
          {uploadMode === 'file' && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              {uploadedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-white rounded-lg border">
                    <FileText className="w-8 h-8 text-purple-600 mr-3" />
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
                      <p className="text-sm font-medium text-green-700 mb-2">数据预览（1分钟间隔）：</p>
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

                  {uploadStatus === 'success' && (
                    <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {uploadMessage}
                    </div>
                  )}
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="p-6 border-2 border-dashed border-purple-300 rounded-lg text-center hover:border-purple-500 hover:bg-purple-50 transition-all">
                    {fileUploading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mr-2" />
                        <span className="text-purple-600">解析中...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto text-purple-400 mb-2" />
                        <p className="text-purple-600 font-medium">点击选择文件</p>
                        <p className="text-xs text-gray-500 mt-1">支持 CSV、JSON 格式，数据需1分钟间隔</p>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          )}

          {/* 蓝牙模式提示 */}
          {uploadMode === 'bluetooth' && (
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
              {bluetoothConnected ? '设备已连接，开始测量后将每分钟自动记录数据' : '请先连接蓝牙设备'}
            </div>
          )}

          {/* 测量控制 */}
          <div className="flex items-center gap-4">
            {!isMeasuring ? (
              <Button 
                onClick={handleStartMeasure} 
                disabled={
                  (uploadMode === 'bluetooth' && !bluetoothConnected) || // 蓝牙模式必须先连接
                  !selectedEnv || 
                  (uploadMode === 'file' && !filePreview)
                }
              >
                <Play className="w-4 h-4 mr-2" />
                开始测量
              </Button>
            ) : (
              <Button onClick={handleStopMeasure} variant="destructive">
                <Square className="w-4 h-4 mr-2" />
                停止测量
              </Button>
            )}

            {isMeasuring && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <Clock className="w-4 h-4 text-green-600" />
                <span className="font-mono text-green-700">{formatTime(elapsedTime)}</span>
              </div>
            )}

            {selectedEnv && (
              <Badge variant="outline" className="ml-auto">
                {selectedEnv.name}
              </Badge>
            )}
          </div>

          {/* 实时数据展示 */}
          {isMeasuring && uploadMode === 'bluetooth' && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <Thermometer className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-700">{vitalData.tcr.toFixed(1)}°C</p>
                <p className="text-xs text-gray-500">核心温度 Tcr</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-3 text-center">
                <ThermometerSun className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-teal-700">{vitalData.tsk.toFixed(1)}°C</p>
                <p className="text-xs text-gray-500">皮肤温度 Tsk</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <Heart className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{vitalData.hr}</p>
                <p className="text-xs text-gray-500">心率 HR (bpm)</p>
              </div>
            </div>
          )}

          {/* 上传状态 */}
          {uploadStatus !== 'idle' && uploadStatus !== 'success' && (
            <div className="flex items-center gap-2 text-sm">
              {uploadStatus === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{uploadMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== 位置地图 ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              位置地图
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Input
                  placeholder="搜索地区..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-48 h-8 text-sm pr-8"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </button>
                {/* 搜索结果下拉 */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleSelectResult(result)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm border-b last:border-0 transition-colors"
                      >
                        <p className="font-medium text-gray-900 truncate">{result.name}</p>
                        {result.district && (
                          <p className="text-xs text-gray-500 truncate">{result.district}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleGetLocation} disabled={locationLoading || !mapReady} size="sm" variant="outline">
                {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                GPS定位
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {locationError && (
            <div className="mb-2 p-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
              {locationError}
            </div>
          )}
          <div className="relative">
            <div 
              ref={handleMapRef}
              className="h-80 rounded-lg border bg-gray-100"
            />
            {/* 中心指针 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full pointer-events-none">
              <div className="relative">
                <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-red-500" />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            {clickAddress ? `指针位置：${clickAddress}` : '拖动地图选择位置'}
          </p>
        </CardContent>
      </Card>

      {/* ===== 天气信息 ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-500" />
            天气信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weather?.lives ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <Thermometer className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{weather.lives.temperature}°C</p>
                  <p className="text-sm text-gray-500">气温</p>
                </div>
                <div className="bg-cyan-50 rounded-lg p-4 text-center">
                  <Droplets className="w-6 h-6 text-cyan-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-cyan-700">{weather.lives.humidity}%</p>
                  <p className="text-sm text-gray-500">湿度</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{weather.lives.pressure}</p>
                  <p className="text-sm text-gray-500">气压 hPa</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <Wind className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{weather.lives.winddirection}</p>
                  <p className="text-sm text-gray-500">风向</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{weather.lives.windpower}</p>
                  <p className="text-sm text-gray-500">风力</p>
                </div>
              </div>
              {/* 数据来源 */}
              <div className="text-xs text-gray-400 text-center border-t pt-3 mt-3">
                天气数据为模拟数据
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <Droplets className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>点击地图选择位置获取天气</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== 穿衣推荐 ===== */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-orange-500" />
            穿衣推荐
          </CardTitle>
        </CardHeader>
        <CardContent>
          {adviceLoading ? (
            <div className="flex items-center gap-2 text-orange-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>正在生成穿衣建议...</span>
            </div>
          ) : clothingAdvice ? (
            <p className="text-gray-700 leading-relaxed">{clothingAdvice}</p>
          ) : (
            <p className="text-gray-400">获取天气后自动生成建议</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
