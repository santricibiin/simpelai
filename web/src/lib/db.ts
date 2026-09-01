import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL || "mysql://neuroforge:9138d307ba0f9c917632fbc5a00e283f@127.0.0.1:3306/neuroforge";

const globalForDb = globalThis as unknown as { dbPool?: mysql.Pool };

export const pool: mysql.Pool =
  globalForDb.dbPool ??
  mysql.createPool({
    uri: DB_URL,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.dbPool = pool;

export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function execute(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const [res] = await pool.query(sql, params);
  return res as mysql.ResultSetHeader;
}
