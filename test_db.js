const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wvqckuyoococsybsawcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cWNrdXlvb2NvY3N5YnNhd2N3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI0NTkzNiwiZXhwIjoyMDkxODIxOTM2fQ.Bh0X6og3DHh2L_ANQ9Ye_8qih_QQJfqbJEByhV0aoyA'
);

async function test() {
  const { data, error } = await supabase
    .from('user_environment_stats')
    .select('*')
    .limit(5);
  console.log('data:', JSON.stringify(data, null, 2));
  console.log('error:', error);
}
test();
