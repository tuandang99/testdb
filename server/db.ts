import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Tạo kết nối đến cơ sở dữ liệu ứng dụng (chỉ dùng cho ứng dụng quản lý, không phải cho người dùng)
// Nếu không có DATABASE_URL, tạo một kết nối ảo chỉ để có thể khởi động ứng dụng
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/dbmanager';

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
