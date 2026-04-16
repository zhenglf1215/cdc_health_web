import { NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

export async function GET() {
  try {
    // 列出所有文件获取下载链接
    const result = await storage.listFiles({ maxKeys: 100 });
    
    // 查找源码包
    const sourceZip = result.keys?.find((k: string) => k.includes('cdc-health-source.zip'));
    
    if (sourceZip) {
      const downloadUrl = await storage.generatePresignedUrl({
        key: sourceZip,
        expireTime: 86400 * 7,
      });
      
      return NextResponse.json({ downloadUrl });
    }
    
    return NextResponse.json({ error: '源码包未找到，请联系管理员' }, { status: 404 });
  } catch (error) {
    console.error('下载错误:', error);
    return NextResponse.json({ error: '下载失败' }, { status: 500 });
  }
}
