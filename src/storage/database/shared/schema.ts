import { pgTable, serial, timestamp, varchar, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 用户表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    company: varchar("company", { length: 100 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    last_login: timestamp("last_login", { withTimezone: true }),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_role_idx").on(table.role),
  ]
);

// ==================== 生命体征持续记录表（所有设备数据） ====================
export const vitalRecords = pgTable(
  "vital_records",
  {
    id: serial("id").primaryKey(),
    user_id: varchar("user_id", { length: 36 }).notNull(),
    environment_id: varchar("environment_id", { length: 36 }).notNull(),
    environment_name: varchar("environment_name", { length: 100 }),
    data_type: varchar("data_type", { length: 10 }).notNull(), // tcr, tsk, hr
    value: varchar("value", { length: 50 }).notNull(),
    recorded_at: timestamp("recorded_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("vital_records_user_id_idx").on(table.user_id),
    index("vital_records_environment_id_idx").on(table.environment_id),
    index("vital_records_data_type_idx").on(table.data_type),
    index("vital_records_recorded_at_idx").on(table.recorded_at),
  ]
);

// ==================== CDC测量会话表 ====================
export const cdcSessions = pgTable(
  "cdc_sessions",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    user_id: varchar("user_id", { length: 36 }).notNull(),
    environment_id: varchar("environment_id", { length: 36 }).notNull(),
    environment_name: varchar("environment_name", { length: 100 }),
    start_time: timestamp("start_time", { withTimezone: true }).defaultNow().notNull(),
    end_time: timestamp("end_time", { withTimezone: true }),
    status: varchar("status", { length: 20 }).default('active').notNull(), // active, completed, cancelled
    // Tcr统计数据
    tcr_avg: varchar("tcr_avg", { length: 50 }),
    tcr_sd: varchar("tcr_sd", { length: 50 }),
    tcr_cv: varchar("tcr_cv", { length: 50 }),
    tcr_count: serial("tcr_count"),
    // Tsk统计数据
    tsk_avg: varchar("tsk_avg", { length: 50 }),
    tsk_sd: varchar("tsk_sd", { length: 50 }),
    tsk_cv: varchar("tsk_cv", { length: 50 }),
    tsk_count: serial("tsk_count"),
    // HR统计数据
    hr_avg: varchar("hr_avg", { length: 50 }),
    hr_sd: varchar("hr_sd", { length: 50 }),
    hr_cv: varchar("hr_cv", { length: 50 }),
    hr_count: serial("hr_count"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("cdc_sessions_user_id_idx").on(table.user_id),
    index("cdc_sessions_environment_id_idx").on(table.environment_id),
    index("cdc_sessions_status_idx").on(table.status),
  ]
);

// 健康检查表
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 环境表
export const environments = pgTable("environments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull(),
  company: varchar("company", { length: 100 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 用户环境统计数据表
export const userEnvironmentStats = pgTable("user_environment_stats", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id", { length: 36 }),
  environment: varchar("environment", { length: 100 }).notNull(),
  environment_id: varchar("environment_id", { length: 36 }),
  company: varchar("company", { length: 100 }),
  hr_av: varchar("hr_av", { length: 50 }),
  hr_ad: varchar("hr_ad", { length: 50 }),
  hr_sd: varchar("hr_sd", { length: 50 }),
  hr_cv: varchar("hr_cv", { length: 50 }),
  hr_skew: varchar("hr_skew", { length: 50 }),
  hr_count: serial("hr_count"),
  tcr_av: varchar("tcr_av", { length: 50 }),
  tcr_ad: varchar("tcr_ad", { length: 50 }),
  tcr_sd: varchar("tcr_sd", { length: 50 }),
  tcr_cv: varchar("tcr_cv", { length: 50 }),
  tcr_skew: varchar("tcr_skew", { length: 50 }),
  tcr_count: serial("tcr_count"),
  tsk_av: varchar("tsk_av", { length: 50 }),
  tsk_ad: varchar("tsk_ad", { length: 50 }),
  tsk_sd: varchar("tsk_sd", { length: 50 }),
  tsk_cv: varchar("tsk_cv", { length: 50 }),
  tsk_skew: varchar("tsk_skew", { length: 50 }),
  tsk_count: serial("tsk_count"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 用户档案表
export const userProfiles = pgTable("user_profiles", {
  id: serial().primaryKey(),
  user_id: varchar("user_id", { length: 36 }).notNull(),
  avatar_url: varchar("avatar_url", { length: 500 }),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  birth_date: varchar("birth_date", { length: 20 }),
  gender: varchar("gender", { length: 10 }),
  height: varchar("height", { length: 10 }),
  weight: varchar("weight", { length: 10 }),
  blood_type: varchar("blood_type", { length: 10 }),
  medical_history: varchar("medical_history", { length: 500 }),
  allergies: varchar("allergies", { length: 500 }),
  exercise_frequency: varchar("exercise_frequency", { length: 50 }),
  sleep_hours: varchar("sleep_hours", { length: 10 }),
  smoking_status: varchar("smoking_status", { length: 20 }),
  drinking_status: varchar("drinking_status", { length: 20 }),
  emergency_contact_name: varchar("emergency_contact_name", { length: 50 }),
  emergency_contact_phone: varchar("emergency_contact_phone", { length: 20 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
