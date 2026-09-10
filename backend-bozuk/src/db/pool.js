import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DATABASE_URL varsa PostgreSQL bağlantısı kurulur.
// Render'ın PostgreSQL'i SSL ister; local için ssl kapalı.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

// Şemayı çalıştır (tablolar yoksa oluşturur)
export async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ PostgreSQL şeması hazır (tablolar oluşturuldu/doğrulandı).');
}

export const query = (text, params) => pool.query(text, params);
