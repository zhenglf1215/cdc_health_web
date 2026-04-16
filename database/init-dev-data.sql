-- ============================================
-- CDC健康检测系统 - 开发环境数据库
-- ============================================

-- 1. 关闭 RLS（开发阶段）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE environments DISABLE ROW LEVEL SECURITY;
ALTER TABLE cdc_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE vital_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE raw_samples DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_environment_stats DISABLE ROW LEVEL SECURITY;

-- 2. 插入示例数据

-- 测试用户（密码是 admin123 的加密形式）
INSERT INTO users (username, password, role, company) VALUES 
('admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', '测试公司'),
('worker01', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'applicant', '工程部'),
('worker02', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'applicant', '安监部');

-- 用户资料
INSERT INTO user_profiles (user_id, email, phone, birth_date, gender, height, weight, blood_type) 
SELECT id, 'admin@test.com', '13800138000', '1990-01-01', '男', 175, 70.5, 'O'
FROM users WHERE username = 'admin';

INSERT INTO user_profiles (user_id, email, phone, birth_date, gender, height, weight, blood_type) 
SELECT id, 'worker01@test.com', '13800138001', '1992-05-15', '男', 170, 65.0, 'A'
FROM users WHERE username = 'worker01';

INSERT INTO user_profiles (user_id, email, phone, birth_date, gender, height, weight, blood_type) 
SELECT id, 'worker02@test.com', '13800138002', '1995-08-20', '女', 162, 55.0, 'B'
FROM users WHERE username = 'worker02';

-- 测试环境
INSERT INTO environments (name, description, latitude, longitude, address, temperature, humidity) VALUES 
('生产车间A', '高温作业区', 29.5432, 106.5314, '重庆市渝北区某路1号', 32.5, 55),
('原料仓库B', '物资存储区', 29.5445, 106.5320, '重庆市渝北区某路2号', 25.0, 70),
('办公楼C', '办公区域', 29.5450, 106.5330, '重庆市渝北区某路3号', 22.0, 60);

-- CDC测试会话
INSERT INTO cdc_sessions (id, user_id, environment_id, environment_name, start_time, end_time, status) 
SELECT 'session-001', id, (SELECT id FROM environments WHERE name = '生产车间A'), '生产车间A', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 'completed'
FROM users WHERE username = 'worker01';

INSERT INTO cdc_sessions (id, user_id, environment_id, environment_name, start_time, status) 
SELECT 'session-002', id, (SELECT id FROM environments WHERE name = '原料仓库B'), '原料仓库B', NOW(), 'active'
FROM users WHERE username = 'worker02';

-- 生命体征记录
INSERT INTO vital_records (user_id, environment_id, environment_name, data_type, value, recorded_at) 
SELECT 
    (SELECT id FROM users WHERE username = 'worker01'),
    (SELECT id FROM environments WHERE name = '生产车间A'),
    '生产车间A',
    'HR',
    72.5 + (random() * 10)::numeric(10,1),
    NOW() - INTERVAL '1 hour 50 minutes'
FROM generate_series(1, 10);

INSERT INTO vital_records (user_id, environment_id, environment_name, data_type, value, recorded_at) 
SELECT 
    (SELECT id FROM users WHERE username = 'worker01'),
    (SELECT id FROM environments WHERE name = '生产车间A'),
    '生产车间A',
    'Tcr',
    36.5 + (random() * 0.5)::numeric(10,2),
    NOW() - INTERVAL '1 hour 50 minutes'
FROM generate_series(1, 10);

INSERT INTO vital_records (user_id, environment_id, environment_name, data_type, value, recorded_at) 
SELECT 
    (SELECT id FROM users WHERE username = 'worker01'),
    (SELECT id FROM environments WHERE name = '生产车间A'),
    '生产车间A',
    'TSK',
    33.0 + (random() * 2)::numeric(10,1),
    NOW() - INTERVAL '1 hour 50 minutes'
FROM generate_series(1, 10);

-- 查询验证
SELECT 'users 表' as 表名, COUNT(*) as 记录数 FROM users
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'environments', COUNT(*) FROM environments
UNION ALL SELECT 'cdc_sessions', COUNT(*) FROM cdc_sessions
UNION ALL SELECT 'vital_records', COUNT(*) FROM vital_records
UNION ALL SELECT 'raw_samples', COUNT(*) FROM raw_samples
UNION ALL SELECT 'user_environment_stats', COUNT(*) FROM user_environment_stats;
