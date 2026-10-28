import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';

const poolOptions = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'sticky_notes',
  user: process.env.DB_USER || 'sticky_app',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
};

if (process.env.DB_SSL === 'true') {
  const sslOptions = { rejectUnauthorized: true };
  const caFile = process.env.DB_SSL_CA_FILE;

  if (caFile) {
    sslOptions.ca = readFileSync(caFile, 'utf8');
  }

  poolOptions.ssl = sslOptions;
}

const pool = mysql.createPool(poolOptions);

export default pool;
