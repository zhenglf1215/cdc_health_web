import { createClient } from '@supabase/supabase-js';

const url = 'https://wvqckuyoococsybsawcw.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cWNrdXlvb2NvY3N5YnNhd2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU5MzYsImV4cCI6MjA5MTgyMTkzNn0.ZL5d_P-itU-u-utrh6nAPe8RgpHtejJPQDH72cVH0w0';

const client = createClient(url, anonKey);

async function test() {
  // 先查询admin
  const { data, error } = await client
    .from('users')
    .select('id, username, password')
    .eq('username', 'admin');
  
  console.log('Query result:');
  console.log('data:', JSON.stringify(data, null, 2));
  console.log('error:', error);
  
  // 验证bcrypt
  if (data && data[0]) {
    const bcrypt = await import('bcryptjs');
    const match = await bcrypt.default.compare('admin123', data[0].password);
    console.log('bcrypt compare result:', match);
  }
}

test();
