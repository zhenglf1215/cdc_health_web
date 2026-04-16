-- CDC健康检测系统 数据库表结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'applicant' CHECK (role IN ('applicant', 'admin')),
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. 环境表
CREATE TABLE IF NOT EXISTS environments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CDC会话表
CREATE TABLE IF NOT EXISTS cdc_sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES environments(id),
    environment_name VARCHAR(200),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 用户环境统计数据表
CREATE TABLE IF NOT EXISTS user_environment_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    environment VARCHAR(200),
    av DECIMAL(10, 4),
    ad DECIMAL(10, 4),
    cv DECIMAL(10, 4),
    skew DECIMAL(10, 4),
    cdc DECIMAL(10, 6),
    sample_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 生命体征持续记录表
CREATE TABLE IF NOT EXISTS vital_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES environments(id),
    environment_name VARCHAR(200),
    data_type VARCHAR(20) NOT NULL,
    value DECIMAL(10, 4),
    recorded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. 生命体征数据表（汇总数据）
CREATE TABLE IF NOT EXISTS vital_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    environment_name VARCHAR(200),
    body_temperature DECIMAL(4, 1),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. 心率数据表
CREATE TABLE IF NOT EXISTS heart_rate_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company TEXT,
    environment_name VARCHAR(200),
    heart_rate INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. 穿衣建议表
CREATE TABLE IF NOT EXISTS clothing_advice (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    environment_name VARCHAR(200),
    temperature DECIMAL(5, 1),
    humidity DECIMAL(5, 1),
    advice TEXT,
    clothing_items TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_env_stats_user_id ON user_environment_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_env_stats_env ON user_environment_stats(environment);
CREATE INDEX IF NOT EXISTS idx_cdc_sessions_user ON cdc_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cdc_sessions_status ON cdc_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vital_records_user ON vital_records(user_id);
CREATE INDEX IF NOT EXISTS idx_vital_records_type ON vital_records(data_type);
CREATE INDEX IF NOT EXISTS idx_vital_records_time ON vital_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_vital_data_user ON vital_data(user_id);
CREATE INDEX IF NOT EXISTS idx_heart_rate_user ON heart_rate_data(user_id);
CREATE INDEX IF NOT EXISTS idx_heart_rate_env ON heart_rate_data(environment_name);
CREATE INDEX IF NOT EXISTS idx_heart_rate_timestamp ON heart_rate_data(timestamp);

-- 启用 Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdc_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_environment_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE heart_rate_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_advice ENABLE ROW LEVEL SECURITY;

-- 为所有表创建公开访问的 RLS 策略
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to environments" ON environments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cdc_sessions" ON cdc_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_environment_stats" ON user_environment_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to vital_records" ON vital_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to vital_data" ON vital_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to heart_rate_data" ON heart_rate_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to clothing_advice" ON clothing_advice FOR ALL USING (true) WITH CHECK (true);

-- 插入测试管理员账号（密码: admin123）
INSERT INTO users (username, password, role, company)
VALUES ('admin', '$2a$10$8K1p/a0dL3.HKwHkKMqcOuHMU8pORfQCBQQUMhN/3p.cB6cqn/GXS', 'admin', 'CDC健康检测中心')
ON CONFLICT (username) DO NOTHING;

-- 插入测试普通用户账号（密码: test123）
INSERT INTO users (username, password, role, company)
VALUES ('testuser', '$2a$10$rQZ5qN12345678901234567890123456789012345678901234567', 'applicant', '测试公司')
ON CONFLICT (username) DO NOTHING;

-- 插入一些示例环境数据
INSERT INTO environments (name, description, latitude, longitude, address)
VALUES 
    ('办公室A区', '总部大楼A区办公室', 39.9042, 116.4074, '北京市朝阳区'),
    ('生产车间', '生产制造车间', 39.9142, 116.4174, '北京市朝阳区'),
    ('户外作业区', '室外施工作业区', 39.9242, 116.4274, '北京市海淀区')
ON CONFLICT DO NOTHING;
