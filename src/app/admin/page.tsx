"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Users, 
  Activity,
  Clock,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Loader2,
  Plus,
  CheckCircle,
  Search,
  RefreshCw,
  AlertTriangle,
  Heart,
  ThermometerSun,
  Globe,
  ArrowRight,
} from "lucide-react";
import '@/styles/cdc-animations.css';

interface WeatherData {
  success: boolean;
  location: string;
  source?: string;
  lives?: {
    weather: string;
    temperature: string;
    humidity: string;
    pressure: string;
    winddirection: string;
    windpower: string;
  };
}

interface RecentActivity {
  id: number;
  action: string;
  user: string;
  time: string;
}

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center: { lat: number; lng: number };
  address: string;
  onSuccess: () => void;
}

function PublishEnvDialog({ open, onOpenChange, center, address, onSuccess }: PublishDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('请输入环境名称');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          latitude: center.lat,
          longitude: center.lng,
          address: address,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setName('');
          setDescription('');
          onOpenChange(false);
          onSuccess();
        }, 1500);
      } else {
        alert(data.message || '发布失败');
      }
    } catch (err) {
      alert('发布失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            发布环境
          </DialogTitle>
        </DialogHeader>
        
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-600">发布成功！</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500 mb-1">位置信息</p>
              <p className="text-sm font-medium">{address || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`}</p>
              <p className="text-xs text-gray-400 mt-1">
                经度: {center.lng.toFixed(6)} | 纬度: {center.lat.toFixed(6)}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">环境名称 *</label>
              <Input
                placeholder="请输入环境名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">环境描述（可选）</label>
              <Textarea
                placeholder="请输入环境描述（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              发布
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // 地图和天气状态
  const [mapContainer, setMapContainer] = useState<HTMLElement | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [clickAddress, setClickAddress] = useState('重庆市');
  const [gpsPosition, setGpsPosition] = useState<{ lng: number; lat: number } | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [currentCenter, setCurrentCenter] = useState({ lat: 29.544, lng: 106.531 });
  
  // 发布环境弹窗
  const [publishOpen, setPublishOpen] = useState(false);

  // 地区搜索
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const mapRef = useRef<any>(null);
  const gpsMarkerRef = useRef<any>(null);

  // 页面加载时设置高德地图安全密钥
  useEffect(() => {
    // 在 AMap SDK 加载前设置安全密钥
    (window as any)._AMapSecurityConfig = {
      securityJsCode: '2b2821be9825aa9ee71a6f9c8d82ccb1',
    };
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const usersRes = await fetch("/api/users/stats");
      const usersData = await usersRes.json();
      setStats({
          totalUsers: usersData.totalUsers || 0
        });

      try {
        const activityRes = await fetch("/api/activity/recent?limit=5");
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          if (activityData.success && activityData.data) {
            setRecentActivity(activityData.data);
          }
        }
      } catch {
        setRecentActivity([{ id: 1, action: "暂无活动记录", user: "-", time: "-" }]);
      }
    } catch (error) {
      console.error("获取数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishSuccess = () => {
    // 发布成功后的回调，可以刷新环境列表等
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
    
    console.log('选择结果:', result);
    console.log('地图实例:', mapRef.current);
    
    if (!lng || !lat) {
      console.error('结果没有位置信息');
      return;
    }
    
    // 地图跳转 - 高德地图使用 [lng, lat] 格式
    if (mapRef.current) {
      console.log('跳转地图到:', lng, lat);
      mapRef.current.setCenter([lng, lat]);
      mapRef.current.setZoom(14);
    } else {
      console.error('地图实例未初始化');
    }
    
    // 更新地址和天气
    setClickAddress(result.name || result.address);
    setCurrentCenter({ lat, lng });
    setShowResults(false);
    setSearchQuery('');
    
    // 更新天气
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then(res => res.json())
      .then(weatherData => setWeather(weatherData))
      .catch(err => console.error('更新天气失败:', err));
  };

  // 地图功能
  const initMap = async (container: HTMLElement) => {
    try {
      const AMapLoader = (await import("@amap/amap-jsapi-loader")).default;
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
        
        // 更新当前中心位置
        setCurrentCenter({ lat, lng });

        const geocoder = new AMap.Geocoder();
        geocoder.getAddress([lng, lat], (status: string, result: any) => {
          const address = status === 'complete' ? result.regeocode?.formattedAddress : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setClickAddress(address);
        });

        try {
          const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
          const weatherData = await res.json();
          setWeather(weatherData);
        } catch {}
      };

      map.on('moveend', updateWeatherByCenter);

      // 默认天气
      try {
        const res = await fetch('/api/weather?lat=29.544&lng=106.531');
        const weatherData = await res.json();
        setWeather(weatherData);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据概览</h1>
        <p className="text-gray-500 mt-1">查看系统整体运行状态</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-md">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white glass-effect card-hover fade-in-up shadow-lg shadow-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 font-medium">总用户数</p>
                <p className="text-4xl font-bold mt-2 count-bounce">{stats.totalUsers}</p>
                <p className="text-white/70 text-sm mt-1">注册用户总数</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 位置地图 */}
      <Card className="glass-effect card-hover fade-in-up delay-300">
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
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
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
              <Button 
                onClick={() => setPublishOpen(true)} 
                disabled={!mapReady}
                size="sm"
                className="bg-red-500 hover:bg-red-600"
              >
                <MapPin className="w-4 h-4 mr-2" />
                发布环境
              </Button>
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

      {/* 天气信息 */}
        <Card className="glass-effect card-hover fade-in-up delay-400">
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
                  <div className="bg-blue-50 rounded-lg p-4 text-center grow-up">
                    <Thermometer className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-700">
                      <span className="count-bounce inline-block">{weather.lives.temperature}</span>°C
                    </p>
                    <p className="text-sm text-gray-500">气温</p>
                  </div>
                  <div className="bg-cyan-50 rounded-lg p-4 text-center grow-up delay-100">
                    <Droplets className="w-6 h-6 text-cyan-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-cyan-700">
                      <span className="count-bounce inline-block">{weather.lives.humidity}</span>%
                    </p>
                    <p className="text-sm text-gray-500">湿度</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center grow-up delay-200">
                    <p className="text-2xl font-bold text-purple-700">{weather.lives.pressure}</p>
                    <p className="text-sm text-gray-500">气压 hPa</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center grow-up delay-300">
                    <Wind className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-700">{weather.lives.winddirection}</p>
                    <p className="text-sm text-gray-500">风向</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center grow-up delay-400">
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
                <div className="w-12 h-12 mx-auto mb-2 opacity-50 float-animation">
                  <Droplets className="w-12 h-12" />
                </div>
                <p>点击地图选择位置获取天气</p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* 最近活动 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            最近活动
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Activity className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.user}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-400 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>暂无活动记录</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 发布环境弹窗 */}
      <PublishEnvDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        center={currentCenter}
        address={clickAddress}
        onSuccess={handlePublishSuccess}
      />
    </div>
  );
}
