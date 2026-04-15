import { NextRequest, NextResponse } from "next/server";

// 根据天气生成穿衣建议
function getClothingAdvice(temperature: number, humidity: number, weather: string, windSpeed: number): string {
  let advice = '';

  // 根据温度判断
  if (temperature < 0) {
    advice = '建议穿羽绒服、棉服等厚实保暖衣物，戴帽子手套，注意防寒防滑。';
  } else if (temperature < 10) {
    advice = '建议穿毛衣、厚外套、牛仔裤，可搭配围巾，注意早晚温差。';
  } else if (temperature < 20) {
    advice = '建议穿长袖衬衫、薄外套、牛仔裤，早晚可加件薄针织衫。';
  } else if (temperature < 28) {
    advice = '建议穿短袖T恤、薄衬衫、长裤或长裙，注意防晒。';
  } else {
    advice = '建议穿轻薄的短袖、短裤，注意防暑降温，多补充水分。';
  }

  // 根据天气类型补充
  if (weather.includes('雨')) {
    advice += '记得带伞，穿防滑鞋。';
  } else if (weather.includes('雪')) {
    advice += '穿防滑保暖的鞋子，注意出行安全。';
  } else if (weather.includes('晴') && temperature > 25) {
    advice += '紫外线较强，建议戴帽子和太阳镜。';
  }

  // 根据风力补充
  if (windSpeed > 5) {
    advice += '风力较大，外出注意防风。';
  }

  // 根据湿度补充
  if (humidity > 80 && temperature > 25) {
    advice += '湿度较大，体感闷热，注意防暑。';
  } else if (humidity < 30) {
    advice += '空气干燥，注意补水保湿。';
  }

  return advice;
}

export async function POST(request: NextRequest) {
  try {
    const { weather } = await request.json();
    
    const { temperature, humidity, windSpeed, weather: weatherType, location } = weather;
    
    // 根据天气生成建议
    const advice = getClothingAdvice(temperature, humidity, weatherType, windSpeed);

    const encoder = new TextEncoder();
    const streamData = new ReadableStream({
      async start(controller) {
        // 模拟打字机效果，逐步输出
        for (let i = 0; i < advice.length; i++) {
          controller.enqueue(encoder.encode(advice[i]));
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        controller.close();
      }
    });

    return new Response(streamData, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('服装推荐API错误:', error);
    return NextResponse.json(
      { error: '服务暂时不可用，请稍后重试' },
      { status: 500 }
    );
  }
}
