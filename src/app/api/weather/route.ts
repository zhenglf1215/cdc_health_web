import { NextRequest, NextResponse } from 'next/server';

// 城市坐标映射
const cities: Record<string, { lat: number; lng: number; name: string }> = {
  '北京': { lat: 39.9, lng: 116.4, name: '北京市' },
  '上海': { lat: 31.2, lng: 121.5, name: '上海市' },
  '广州': { lat: 23.1, lng: 113.3, name: '广州市' },
  '深圳': { lat: 22.5, lng: 114.1, name: '深圳市' },
  '杭州': { lat: 30.3, lng: 120.2, name: '杭州市' },
  '成都': { lat: 30.7, lng: 104.1, name: '成都市' },
  '武汉': { lat: 30.6, lng: 114.3, name: '武汉市' },
  '西安': { lat: 34.3, lng: 108.9, name: '西安市' },
  '南京': { lat: 32.1, lng: 118.8, name: '南京市' },
  '重庆': { lat: 29.5, lng: 106.5, name: '重庆市' },
  '天津': { lat: 39.1, lng: 117.2, name: '天津市' },
  '苏州': { lat: 31.3, lng: 120.6, name: '苏州市' },
  '长沙': { lat: 28.2, lng: 112.9, name: '长沙市' },
  '郑州': { lat: 34.8, lng: 113.7, name: '郑州市' },
  '青岛': { lat: 36.1, lng: 120.4, name: '青岛市' },
  '沈阳': { lat: 41.8, lng: 123.4, name: '沈阳市' },
  '大连': { lat: 38.9, lng: 121.6, name: '大连市' },
  '厦门': { lat: 24.5, lng: 118.1, name: '厦门市' },
  '济南': { lat: 36.7, lng: 117.0, name: '济南市' },
  '昆明': { lat: 25.0, lng: 102.7, name: '昆明市' },
  '哈尔滨': { lat: 45.8, lng: 126.5, name: '哈尔滨市' },
  '福州': { lat: 26.1, lng: 119.3, name: '福州市' },
  '长春': { lat: 43.9, lng: 125.3, name: '长春市' },
  '石家庄': { lat: 38.0, lng: 114.5, name: '石家庄市' },
  '南昌': { lat: 28.7, lng: 115.9, name: '南昌市' },
  '合肥': { lat: 31.9, lng: 117.3, name: '合肥市' },
  '南宁': { lat: 22.8, lng: 108.3, name: '南宁市' },
  '贵阳': { lat: 26.6, lng: 106.7, name: '贵阳市' },
  '太原': { lat: 37.9, lng: 112.5, name: '太原市' },
  '兰州': { lat: 36.1, lng: 103.8, name: '兰州市' },
};

// WMO 天气代码转中文
function getWeatherText(code: number): string {
  const weatherMap: Record<number, string> = {
    0: '晴',
    1: '晴',
    2: '晴间多云',
    3: '阴',
    45: '雾',
    48: '雾凇',
    51: '小毛毛雨',
    53: '中毛毛雨',
    55: '大毛毛雨',
    56: '冻毛毛雨',
    57: '强冻毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '冻雨',
    67: '强冻雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '小阵雨',
    81: '中阵雨',
    82: '大阵雨',
    85: '小阵雪',
    86: '大阵雪',
    95: '雷暴',
    96: '雷暴+小冰雹',
    99: '雷暴+大冰雹',
  };
  return weatherMap[code] || '未知';
}

// 获取风向
function getWindDirection(degrees: number): string {
  const directions = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// 获取风力等级
function getWindPower(speed: number): string {
  if (speed < 1) return '无风';
  if (speed < 6) return '1级';
  if (speed < 12) return '2级';
  if (speed < 20) return '3级';
  if (speed < 29) return '4级';
  if (speed < 39) return '5级';
  if (speed < 50) return '6级';
  if (speed < 62) return '7级';
  if (speed < 75) return '8级';
  if (speed < 89) return '9级';
  if (speed < 103) return '10级';
  if (speed < 118) return '11级';
  return '12级';
}

export async function GET(request: NextRequest) {
  try {
    const lat = request.nextUrl.searchParams.get('lat');
    const lng = request.nextUrl.searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json({ error: '缺少经纬度参数' }, { status: 400 });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    // 调用 Open-Meteo API 获取真实天气数据
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lngNum}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=Asia/Shanghai`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // 缓存5分钟
    });

    if (!response.ok) {
      throw new Error('Open-Meteo API 请求失败');
    }

    const data = await response.json();
    const current = data.current;

    // 查找最近的城市
    let nearestCity = '当前位置';
    let minDist = Infinity;
    for (const city of Object.values(cities)) {
      const dist = Math.sqrt(Math.pow(latNum - city.lat, 2) + Math.pow(lngNum - city.lng, 2));
      if (dist < minDist) {
        minDist = dist;
        nearestCity = city.name;
      }
    }

    if (minDist > 2) {
      nearestCity = `${latNum.toFixed(2)}°, ${lngNum.toFixed(2)}°`;
    }

    return NextResponse.json({
      success: true,
      location: nearestCity,
      reportTime: current.time,
      source: 'Open-Meteo',
      lives: {
        weather: getWeatherText(current.weather_code),
        temperature: Math.round(current.temperature_2m).toString(),
        humidity: Math.round(current.relative_humidity_2m).toString(),
        pressure: '1013',
        winddirection: getWindDirection(current.wind_direction_10m),
        windpower: getWindPower(current.wind_speed_10m)
      }
    });

  } catch (error) {
    console.error('天气API错误:', error);
    return NextResponse.json({
      success: false,
      message: '服务异常',
      location: '未知',
      source: '错误',
      lives: {
        weather: '获取失败',
        temperature: '0',
        humidity: '0',
        pressure: '1013',
        winddirection: '无',
        windpower: '0级'
      }
    });
  }
}
