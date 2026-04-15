"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Globe, MapPin, Loader2, Crosshair, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getCurrentUser } from '@/lib/auth';

interface PublishedEnvironment {
  id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  created_at: string;
}

export default function AdminEnvironmentsPage() {
  const [environments, setEnvironments] = useState<PublishedEnvironment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvDesc, setNewEnvDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // 地图相关
  const [mapCenter, setMapCenter] = useState({ lat: 39.908823, lng: 116.397470 }); // 默认北京
  const [locationLoading, setLocationLoading] = useState(false);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const user = getCurrentUser();

  useEffect(() => {
    fetchEnvironments();
  }, []);

  // 弹窗打开时初始化地图
  useEffect(() => {
    if (showAddDialog && !mapReady) {
      initMap();
    }
  }, [showAddDialog]);

  const fetchEnvironments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/environments?company=all');
      const data = await response.json();
      if (data.success) {
        setEnvironments(data.data || []);
      }
    } catch (error) {
      console.error('获取环境列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initMap = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const AMapLoader = await import('@amap/amap-jsapi-loader');
      const AMap = await AMapLoader.default as any;
      
      if (mapRef.current) return;
      
      // 创建地图
      mapRef.current = new AMap.Map('publish-map', {
        zoom: 15,
        center: [mapCenter.lng, mapCenter.lat],
        viewMode: '2D',
      });

      // 创建中心点标记（固定在地图中心）
      markerRef.current = new AMap.Marker({
        position: [mapCenter.lng, mapCenter.lat],
        icon: new AMap.Icon({
          size: new AMap.Size(32, 32),
          image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
          imageSize: new AMap.Size(32, 32),
        }),
        title: '选择的位置',
        offset: new AMap.Pixel(-16, -32),
      });
      mapRef.current.add(markerRef.current);

      // 创建地理编码插件
      mapRef.current.plugin(['AMap.Geocoder'], () => {
        geocoderRef.current = new AMap.Geocoder({
          radius: 1000,
          extensions: 'base',
        });
        setMapReady(true);
        // 初始获取地址
        updateAddress(mapCenter.lng, mapCenter.lat);
      });

      // 地图移动时更新标记位置
      mapRef.current.on('moveend', () => {
        const center = mapRef.current.getCenter();
        const lng = center.getLng();
        const lat = center.getLat();
        
        // 更新标记位置
        if (markerRef.current) {
          markerRef.current.setPosition([lng, lat]);
        }
        
        // 更新状态
        setMarkerPos({ lat, lng, address: markerRef.current?.getTitle() });
        
        // 获取地址
        updateAddress(lng, lat);
      });

    } catch (error) {
      console.error('地图初始化失败:', error);
    }
  };

  // 逆地理编码 - 获取地址
  const updateAddress = (lng: number, lat: number) => {
    if (!geocoderRef.current) return;
    
    geocoderRef.current.getAddress([lng, lat], (status: string, result: any) => {
      if (status === 'complete' && result.regeocode) {
        const address = result.regeocode.formattedAddress;
        setMarkerPos(prev => prev ? { ...prev, address } : { lat, lng, address });
        if (markerRef.current) {
          markerRef.current.setTitle(address);
        }
      }
    });
  };

  // 搜索位置
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const AMapLoader = await import('@amap/amap-jsapi-loader');
      const AMap = await AMapLoader.default as any;
      
      // 使用关键字搜索
      AMap.plugin('AMap.Autocomplete', () => {
        const autoOptions = {
          city: '全国',
        };
        const auto = new AMap.Autocomplete(autoOptions);
        
        auto.search(searchQuery, (status: string, result: any) => {
          setSearching(false);
          if (status === 'complete' && result.tips) {
            setSearchResults(result.tips.filter((tip: any) => tip.location));
          } else {
            setSearchResults([]);
          }
        });
      });
    } catch (error) {
      setSearching(false);
      console.error('搜索失败:', error);
    }
  };

  // 选择搜索结果
  const handleSelectResult = (result: any) => {
    const location = result.location;
    const lng = location.getLng();
    const lat = location.getLat();
    
    // 地图移动到该位置
    mapRef.current.setCenter([lng, lat]);
    
    // 更新标记
    if (markerRef.current) {
      markerRef.current.setPosition([lng, lat]);
      markerRef.current.setTitle(result.name);
    }
    
    // 更新状态
    setMarkerPos({ lat, lng, address: result.name || result.address });
    setSearchResults([]);
    setSearchQuery('');
  };

  // 获取当前位置
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('浏览器不支持定位');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // 地图移动到当前位置
        mapRef.current?.setCenter([longitude, latitude]);
        
        // 更新标记
        if (markerRef.current) {
          markerRef.current.setPosition([longitude, latitude]);
        }
        
        setMarkerPos({ lat: latitude, lng: longitude });
        updateAddress(longitude, latitude);
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        alert('定位失败，请手动选择位置');
      }
    );
  };

  // 发布环境
  const handlePublishEnvironment = async () => {
    if (!newEnvName.trim()) {
      alert('请输入环境名称');
      return;
    }

    if (!markerPos) {
      alert('请先在地图上选择位置');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: newEnvName.trim(),
          description: newEnvDesc.trim() || null,
          latitude: markerPos.lat,
          longitude: markerPos.lng,
          address: markerPos.address || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        resetForm();
        setShowAddDialog(false);
        fetchEnvironments();
      } else {
        alert(data.error || '发布失败');
      }
    } catch (error) {
      alert('发布失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEnvironment = async (id: string, name: string) => {
    if (!confirm(`确定要删除环境「${name}」吗？`)) return;

    try {
      const response = await fetch(`/api/environments?id=${id}&user_id=${user?.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchEnvironments();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const resetForm = () => {
    setNewEnvName('');
    setNewEnvDesc('');
    setSearchQuery('');
    setSearchResults([]);
    setMarkerPos(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">环境发布</h1>
          <p className="text-gray-500 mt-1">在地图上选择位置并发布环境</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              发布环境
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>发布新环境</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 环境名称 */}
              <div className="space-y-2">
                <Label htmlFor="envName">环境名称 *</Label>
                <Input
                  id="envName"
                  placeholder="请输入环境名称，如：朝阳区 outdoor"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                />
              </div>

              {/* 环境描述 */}
              <div className="space-y-2">
                <Label htmlFor="envDesc">环境描述（可选）</Label>
                <Input
                  id="envDesc"
                  placeholder="请输入环境描述"
                  value={newEnvDesc}
                  onChange={(e) => setNewEnvDesc(e.target.value)}
                />
              </div>

              {/* 地图区域 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>位置选择</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleGetCurrentLocation}
                    disabled={locationLoading}
                  >
                    <Crosshair className="w-4 h-4 mr-1" />
                    {locationLoading ? '定位中...' : '定位'}
                  </Button>
                </div>
                
                {/* 搜索框 */}
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="搜索位置..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={handleSearch} disabled={searching}>
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : '搜索'}
                    </Button>
                  </div>
                  
                  {/* 搜索结果 */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border max-h-60 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectResult(result)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-2 border-b last:border-b-0"
                        >
                          <MapPin className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">{result.name}</p>
                            <p className="text-xs text-gray-500">{result.district}{result.address}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 地图 */}
                <div className="relative">
                  <div id="publish-map" className="w-full h-72 rounded-lg border" />
                  {/* 中心标记提示 */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-red-500 drop-shadow-lg" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  拖动或缩放地图，地图中心的标记位置即为发布位置
                </p>

                {/* 已选位置显示 */}
                {markerPos && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800">当前选择的位置</p>
                        <p className="text-xs text-blue-600 font-mono">
                          📍 {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}
                        </p>
                        {markerPos.address && (
                          <p className="text-xs text-blue-600 mt-1">{markerPos.address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 发布按钮 */}
              <Button 
                onClick={handlePublishEnvironment} 
                className="w-full bg-blue-500 hover:bg-blue-600"
                disabled={isSubmitting || !newEnvName.trim() || !markerPos}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    发布环境
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 环境列表 */}
      <Card>
        <CardHeader>
          <CardTitle>已发布环境 ({environments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {environments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Globe className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{env.name}</h3>
                        {env.address && (
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {env.address.length > 20 ? env.address.slice(0, 20) + '...' : env.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      已发布
                    </Badge>
                  </div>
                  
                  {/* 经纬度显示 */}
                  {env.latitude && env.longitude && (
                    <div className="mt-2 text-xs text-gray-400">
                      📍 {env.latitude.toFixed(6)}, {env.longitude.toFixed(6)}
                    </div>
                  )}
                  
                  {/* 描述 */}
                  {env.description && (
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                      {env.description}
                    </p>
                  )}
                  
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      创建于 {formatDate(env.created_at)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteEnvironment(env.id, env.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无已发布的环境</p>
              <p className="text-sm mt-2">点击上方按钮发布新环境</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
