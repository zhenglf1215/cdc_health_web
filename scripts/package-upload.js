const fs = require('fs');
const path = require('path');
const { S3Storage } = require('coze-coding-dev-sdk');

// 初始化存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

const sourceDir = '/workspace/projects';
const outputFile = '/tmp/cdc-health-source.zip';

// 需要排除的文件和目录
const excludePatterns = [
  'node_modules',
  '.git',
  '.next',
  '.env.local',
  'cdc-health-source.zip'
];

function shouldExclude(filePath) {
  return excludePatterns.some(pattern => filePath.includes(pattern));
}

function zipDirectory(sourceDir, outPath) {
  const output = fs.createWriteStream(outPath);
  const archiver = require('archiver');
  
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`Created zip: ${archive.pointer()} total bytes`);
      resolve();
    });
    
    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    
    function addFiles(dir, baseDir = dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = path.relative(baseDir, filePath);
        
        if (shouldExclude(filePath)) continue;
        
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          addFiles(filePath, baseDir);
        } else {
          archive.file(filePath, { name: relativePath });
        }
      }
    }
    
    addFiles(sourceDir);
    archive.finalize();
  });
}

async function main() {
  try {
    console.log('Creating zip archive...');
    await zipDirectory(sourceDir, outputFile);
    
    console.log('Uploading to storage...');
    const fileBuffer = fs.readFileSync(outputFile);
    
    const key = await storage.uploadFile({
      fileContent: fileBuffer,
      fileName: 'cdc-health-source.zip',
      contentType: 'application/zip',
    });
    
    console.log('Generating download URL...');
    const downloadUrl = await storage.generatePresignedUrl({
      key: key,
      expireTime: 86400 * 7, // 7天有效期
    });
    
    console.log('\n=== Download URL ===');
    console.log(downloadUrl);
    console.log('====================\n');
    
    // 清理临时文件
    fs.unlinkSync(outputFile);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
