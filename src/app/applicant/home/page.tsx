'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Activity
} from 'lucide-react';
import { getCurrentUser, type UserInfo } from '@/lib/auth';

interface PublishedEnvironment {
  id: string;
  name: string;
  company: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface UploadedData {
  tcr?: { timestamp: string; value: number }[];
  tsk: { timestamp: string; value: number }[];
  hr: { timestamp: string; value: number }[];
}

export default function ApplicantHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== 位置检索状态 =====
  const [environments, setEnvironments] = useState<PublishedEnvironment[]>([]);
  const [envsLoading, setEnvsLoading] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<PublishedEnvironment | null>(null);

  // ===== 生命体征测量状态 =====
  const [uploadMode, setUploadMode] = useState<'bluetooth' | 'file'>('bluetooth');
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [vitalData, setVitalData] = useState({ tcr: 0, tsk: 0, hr: 0 });

  // 蓝牙测量：Mi和Tcr递推状态（用于HR→Mi→Tcr递推）
  const miTcrStateRef = useRef({ currentMi: 65, currentTcr: 36.8 });
  
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
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    total: number;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dataIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 用户profile信息（用于Mi计算）
  const [userProfile, setUserProfile] = useState<{
    weight?: number;
    birthDate?: string;
    restingHr?: number;
  }>({});

  // 从birth_date计算年龄
  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // 加载用户profile
  const loadUserProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/user-profile?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUserProfile({
            weight: data.data.weight ? parseFloat(data.data.weight) : undefined,
            birthDate: data.data.birth_date,
            restingHr: data.data.resting_hr ? parseInt(data.data.resting_hr) : undefined
          });
        }
      }
    } catch (error) {
      console.error('加载用户profile失败:', error);
    }
  };

  // ===== 地图状态 =====
  const [mapContainer, setMapContainer] = useState<HTMLElement | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [gpsPosition, setGpsPosition] = useState<{ lng: number; lat: number } | null>(null);
  const mapRef = useRef<any>(null);
  const gpsMarkerRef = useRef<any>(null);

  // ===== 天气状态 =====
  const [weather, setWeather] = useState<any>(null);
  const [clickAddress, setClickAddress] = useState('');

  // ===== 地区搜索状态 =====
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // ===== 服装推荐状态 =====
  const [clothingAdvice, setClothingAdvice] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);

  // 初始化
  useEffect(() => {
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
    loadUserProfile(userData.id);
    setLoading(false);
  }, [router]);

  // 加载已发布环境列表
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
    if (env.latitude && env.longitude && mapRef.current) {
      mapRef.current.setCenter([env.longitude, env.latitude]);
      mapRef.current.setZoom(15);
    }
  };

  // ===== 生命体征测量功能 =====
  // 当前CDC会话ID
  const [cdcSessionId, setCdcSessionId] = useState<string | null>(null);

  // 计算劳动代谢率 Mi（基于HR、年龄、体重）
  const calculateMi = (hr: number, age: number = 30, weight: number = 65, restingHr: number = 65): number => {
    // Mi = 65 + (HR - HRrest) / (180 - 0.65×Age - HRrest) × [(41.7 - 0.22×Age) × W^(2/3) - 65]
    const weightKg = weight;
    const weightSurface = Math.pow(weightKg, 2 / 3); // 体表面积相关
    const mi = 65 + ((hr - restingHr) / (180 - 0.65 * age - restingHr)) * ((41.7 - 0.22 * age) * weightSurface - 65);
    return Math.max(30, Math.min(600, mi)); // 限制范围
  };

  // 计算核心体温 Tcr（基于Mi递推）
  const calculateTcrFromMi = (currentMi: number, prevTcr: number): number => {
    // Tcr(t+1) = Tcr(t) + 0.0036 × (Mi - 55) × 0.0952
    const efficiencyFactor = 0.0952;
    const deltaTcr = 0.0036 * (currentMi - 55) * efficiencyFactor;
    const newTcr = prevTcr + deltaTcr;
    return Math.max(35, Math.min(40, newTcr)); // 限制范围
  };

  // 蓝牙连接成功后的数据采集（不管是否点击开始测量）
  const startBluetoothDataCollection = () => {
    if (dataIntervalRef.current) return;
    
    // 重置递推状态
    miTcrStateRef.current = { currentMi: 65, currentTcr: 36.8 };
    
    dataIntervalRef.current = setInterval(async () => {
      // 模拟采集HR和TSK
      const hr = Math.floor(70 + Math.random() * 15);
      const tsk = parseFloat((33 + Math.random() * 2).toFixed(1));
      
      // 从用户profile获取参数用于Mi计算
      const age = userProfile.birthDate ? calculateAge(userProfile.birthDate) : 30;
      const weight = userProfile.weight || 65;
      const restingHr = userProfile.restingHr || 65;
      
      // HR → Mi 递推计算
      const currentMi = calculateMi(hr, age, weight, restingHr);
      miTcrStateRef.current.currentMi = currentMi;
      
      // Mi → Tcr 递推计算
      const currentTcr = calculateTcrFromMi(currentMi, miTcrStateRef.current.currentTcr);
      miTcrStateRef.current.currentTcr = currentTcr;
      
      const data = { tcr: currentTcr, tsk, hr };
      setVitalData(data);
      
      if (user) {
        const timestamp = new Date().toISOString();
        const envName = selectedEnv?.name || '默认环境';
        const envId = selectedEnv?.id || 'default';
        
        // 写入vital_records（显示在图表，触发报警）
        await fetch('/api/vital-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            company: user.company,
            environmentName: envName,
            environmentId: envId,
            tcr: data.tcr,
            tsk: data.tsk,
            hr: data.hr,
            timestamp
          })
        });
      }
    }, 60000);
  };

  const handleStartMeasure = async () => {
    // 蓝牙模式必须先连接设备并选择环境
    if (uploadMode === 'bluetooth') {
      if (!bluetoothConnected) {
        alert('请先连接蓝牙设备');
        return;
      }
      if (!selectedEnv) {
        alert('请先选择测量环境');
        return;
      }
      
      setIsMeasuring(true);
      setElapsedTime(0);
      
      // 创建CDC会话记录
      try {
        const res = await fetch('/api/cdc-measure/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user!.id,
            environmentId: selectedEnv.id,
            environmentName: selectedEnv.name
          })
        });
        const data = await res.json();
        if (data.success) {
          setCdcSessionId(data.sessionId);
        }
      } catch (err) {
        console.error('创建CDC会话失败:', err);
      }
      
      // 开始数据采集
      startBluetoothDataCollection();
      
      timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000);
    } else {
      // 文件上传模式
      if (!filePreview) {
        alert('请先上传数据文件');
        return;
      }
      handleUploadData();
    }
  };

  const handleStopMeasure = async () => {
    setIsMeasuring(false);
    clearInterval(timerRef.current!);
    timerRef.current = null;
    
    // 停止数据采集（可选，保持连接）
    if (dataIntervalRef.current && !bluetoothConnected) {
      clearInterval(dataIntervalRef.current);
      dataIntervalRef.current = null;
    }
    
    // 结束CDC会话（自动查询时间范围内的数据计算CDC）
    if (cdcSessionId && selectedEnv && user) {
      try {
        const res = await fetch('/api/cdc-measure/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: cdcSessionId,
            userId: user.id,
            environmentId: selectedEnv.id,
            environmentName: selectedEnv.name
          })
        });
        const result = await res.json();
        if (result.success) {
          alert('CDC计算完成！\nTcr CDC: ' + (result.cdc?.tcr?.toFixed(4) || 'N/A') + '\nTsk CDC: ' + (result.cdc?.tsk?.toFixed(4) || 'N/A') + '\nHR CDC: ' + (result.cdc?.hr?.toFixed(4) || 'N/A'));
        }
      } catch (err) {
        console.error('CDC计算失败:', err);
      }
    }
    
    setCdcSessionId(null);
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
      // 断开蓝牙，停止数据采集
      setBluetoothConnected(false);
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
        dataIntervalRef.current = null;
      }
      return;
    }
    setConnecting(true);
    setTimeout(() => {
      setBluetoothConnected(true);
      setConnecting(false);
      // 连接成功后开始数据采集（不管是否点击开始测量）
      startBluetoothDataCollection();
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
    setUploadStatus('idle');
    setUploadResult(null);

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

      // JSON 只需要 hr 和 tsk，Mi 和 Tcr 由后端递推计算
      if (!data.hr || !data.tsk) {
        throw new Error('数据格式错误，需要包含 hr 和 tsk 两个字段');
      }

      // 如果没有 tcr 字段，后端会递推计算
      if (data.tcr) {
        data.tcr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
      data.tsk.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      data.hr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // 确保 hr 和 tsk 数量一致
      if (data.hr.length !== data.tsk.length) {
        throw new Error(`hr和tsk数据条数不一致：hr有${data.hr.length}条，tsk有${data.tsk.length}条`);
      }

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

    if (tskIdx === -1 || hrIdx === -1) {
      throw new Error('CSV缺少必要列：tsk、hr');
    }

    const tcr: { timestamp: string; value: number }[] = [];
    const tsk: { timestamp: string; value: number }[] = [];
    const hr: { timestamp: string; value: number }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      let timestamp: string;
      if (timeIdx >= 0 && cols[timeIdx] && cols[timeIdx].trim()) {
        timestamp = cols[timeIdx].trim();
      } else {
        timestamp = new Date(Date.now() - (lines.length - i) * 60000).toISOString();
      }
      
      // tcr 存在就解析，不存在也没关系（后端会递推计算）
      if (tcrIdx >= 0 && cols[tcrIdx]) tcr.push({ timestamp, value: parseFloat(cols[tcrIdx]) });
      if (cols[tskIdx]) tsk.push({ timestamp, value: parseFloat(cols[tskIdx]) });
      if (cols[hrIdx]) hr.push({ timestamp, value: parseFloat(cols[hrIdx]) });
    }

    return { tcr, tsk, hr };
  };

  // ===== 批量上传数据 =====
  const handleUploadData = async () => {
    if (!user || !filePreview) return;

    setUploadStatus('uploading');
    setUploadMessage('正在上传数据...');
    setUploadResult(null);

    let successCount = 0;
    let failedCount = 0;
    const total = filePreview.hr.length;
    let lastUploadedData: { tcr: number; tsk: number; hr: number } | null = null;

    try {
      for (let i = 0; i < filePreview.hr.length; i++) {
        const timestamp = filePreview.hr[i].timestamp;
        
        try {
          const res = await fetch('/api/vital-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              company: user.company,
              environmentName: selectedEnv?.name || '默认环境',
              tcr: filePreview.tcr[i]?.value,
              tsk: filePreview.tsk[i]?.value,
              hr: filePreview.hr[i]?.value,
              timestamp
            })
          });

          if (res.ok) {
            successCount++;
            // 保存最后一条数据用于更新显示
            lastUploadedData = {
              tcr: filePreview.tcr[i]?.value || 0,
              tsk: filePreview.tsk[i]?.value || 0,
              hr: filePreview.hr[i]?.value || 0
            };
          } else {
            const errorText = await res.text();
            console.error(`第${i+1}条上传失败:`, res.status, errorText);
            failedCount++;
          }
        } catch (err) {
          console.error(`第${i+1}条上传异常:`, err);
          failedCount++;
        }

        setUploadMessage(`上传中... ${i + 1}/${total}`);
      }

      setUploadResult({ success: successCount, failed: failedCount, total });
      setUploadStatus('success');
      
      // 如果上传成功，更新显示区域的数据
      if (successCount > 0 && lastUploadedData) {
        setVitalData(lastUploadedData);
      }
      
      const message = failedCount === 0 
        ? `上传成功！共 ${successCount} 条数据已添加到生命体征图表` 
        : `上传完成：成功 ${successCount} 条，失败 ${failedCount} 条。请检查浏览器控制台获取详细错误`;
      setUploadMessage(message);
      
      // 添加浏览器alert反馈
      alert(message);
      
    } catch (err: any) {
      setUploadStatus('error');
      const errorMsg = '上传失败: ' + err.message;
      setUploadMessage(errorMsg);
      alert(errorMsg);
    }
  };

  const handleResetUpload = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setFileError('');
    setUploadStatus('idle');
    setUploadMessage('');
    setUploadResult(null);
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

      const map = new AMap.Map(container, {
        zoom: 12,
        center: [106.531, 29.544],
      });

      mapRef.current = map;

      const updateWeatherByCenter = async () => {
        const center = map.getCenter();
        const lng = center.getLng();
        const lat = center.getLat();

        const geocoder = new AMap.Geocoder();
        geocoder.getAddress([lng, lat], (status: string, result: any) => {
          setClickAddress(status === 'complete' ? result.regeocode?.formattedAddress : `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        });

        try {
          const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
          const weatherData = await res.json();
          setWeather(weatherData);
          fetchClothingAdvice(weatherData);
        } catch {}
      };

      map.on('moveend', updateWeatherByCenter);

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
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
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
        } else {
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
    
    if (!lng || !lat) return;
    
    if (mapRef.current) {
      mapRef.current.setCenter([lng, lat]);
      mapRef.current.setZoom(14);
    }
    
    setClickAddress(result.name || result.address);
    setShowResults(false);
    setSearchQuery('');
    
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then(res => res.json())
      .then(weatherData => {
        setWeather(weatherData);
        fetchClothingAdvice(weatherData);
      })
      .catch(err => console.error('更新天气失败:', err));
  };

  const handleGetLocation = () => {
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

        setGpsPosition({ lng, lat });

        if (mapRef.current) {
          mapRef.current.setCenter([lng, lat]);
          mapRef.current.setZoom(15);

          const AMapLib = (window as any).AMap;
          if (gpsMarkerRef.current) {
            gpsMarkerRef.current.setPosition([lng, lat]);
          } else {
            gpsMarkerRef.current = new AMapLib.Marker({
              position: [lng, lat],
              icon: new AMapLib.Icon({
                size: new AMapLib.Size(32, 32),
                image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
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
  const fetchClothingAdvice = async (weatherData: any) => {
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

  // 跳转到环境地图
  const handleJumpToEnvironmentMap = (env: PublishedEnvironment) => {
    if (env.latitude && env.longitude && mapRef.current) {
      mapRef.current.setCenter([env.longitude, env.latitude]);
      mapRef.current.setZoom(15);
    }
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

      {/* ===== 位置检索 & 生命体征测量 选项卡 ===== */}
      <Tabs defaultValue="location" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            位置检索
          </TabsTrigger>
          <TabsTrigger value="vital" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            生命体征测量
          </TabsTrigger>
        </TabsList>

        {/* ===== 位置检索选项卡 ===== */}
        <TabsContent value="location" className="space-y-4">
          {/* 已发布环境列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                已发布的位置
              </CardTitle>
            </CardHeader>
            <CardContent>
              {envsLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>加载中...</span>
                </div>
              ) : environments.length === 0 ? (
                <p className="text-gray-400 text-center py-4">暂无可用位置</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {environments.map(env => (
                    <div
                      key={env.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedEnv?.id === env.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSelectEnvironment(env)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{env.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{env.company}</p>
                          {env.address && (
                            <p className="text-xs text-gray-400 mt-1">{env.address}</p>
                          )}
                        </div>
                        {env.latitude && env.longitude && (
                          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                            <MapPin className="w-3 h-3 mr-1" />
                            有地图
                          </Badge>
                        )}
                      </div>
                      {env.latitude && env.longitude && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJumpToEnvironmentMap(env);
                          }}
                        >
                          跳转地图
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 位置地图 */}
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
        </TabsContent>

        {/* ===== 生命体征测量选项卡 ===== */}
        <TabsContent value="vital" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                生命体征测量
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 环境选择 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">选择测量环境（可选）</label>
                {envsLoading ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>加载中...</span>
                  </div>
                ) : environments.length === 0 ? (
                  <p className="text-gray-400 text-sm">暂无可用环境，将使用默认环境</p>
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

              {/* 模式切换 */}
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

              {/* 蓝牙模式 */}
              {uploadMode === 'bluetooth' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    {bluetoothConnected ? '设备已连接，开始测量后将每分钟自动记录数据' : '请先连接蓝牙设备'}
                  </div>

                  <div className="flex items-center gap-4">
                    {!isMeasuring ? (
                      <Button 
                        onClick={handleStartMeasure} 
                        disabled={!bluetoothConnected}
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
                  </div>

                  {isMeasuring && (
                    <div className="grid grid-cols-3 gap-4">
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
                </div>
              )}

              {/* 文件上传模式 */}
              {uploadMode === 'file' && (
                <div className="space-y-4">
                  {/* 上传结果展示 */}
                  {uploadResult && uploadStatus === 'success' && (
                    <div className={`p-4 rounded-lg ${uploadResult.failed === 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <div className="flex items-center gap-3">
                        {uploadResult.failed === 0 ? (
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        ) : (
                          <XCircle className="w-8 h-8 text-yellow-600" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${uploadResult.failed === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                            {uploadResult.failed === 0 ? '上传成功！' : '部分上传成功'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            成功上传 {uploadResult.success} 条记录{uploadResult.failed > 0 && `，失败 ${uploadResult.failed} 条`}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleResetUpload}>
                          重新上传
                        </Button>
                      </div>
                    </div>
                  )}

                  {uploadStatus === 'error' && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-8 h-8 text-red-600" />
                        <div className="flex-1">
                          <p className="font-medium text-red-700">上传失败</p>
                          <p className="text-sm text-gray-600 mt-1">{uploadMessage}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleResetUpload}>
                          重试
                        </Button>
                      </div>
                    </div>
                  )}

                  {uploadStatus === 'uploading' && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <div className="flex-1">
                          <p className="font-medium text-blue-700">正在上传...</p>
                          <p className="text-sm text-gray-600 mt-1">{uploadMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 文件选择区域 */}
                  {uploadStatus !== 'uploading' && !uploadResult && (
                    <>
                      {uploadedFile ? (
                        <div className="space-y-3">
                          <div className="flex items-center p-3 bg-white rounded-lg border">
                            <FileText className="w-8 h-8 text-purple-600 mr-3" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{uploadedFile.name}</p>
                              <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button onClick={handleResetUpload} className="p-1 hover:bg-gray-100 rounded">
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
                            onClick={handleUploadData} 
                            disabled={!filePreview}
                            className="w-full"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            上传数据
                          </Button>
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
                                <p className="text-purple-600 font-medium">点击选择文件上传</p>
                                <p className="text-xs text-gray-500 mt-1">支持 CSV、JSON 格式</p>
                              </>
                            )}
                          </div>
                        </label>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
