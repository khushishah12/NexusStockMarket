import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function runSql(sql: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query(sql);
    return true;
  } catch (err) {
    console.error('runSql error:', err);
    return false;
  } finally {
    client.release();
  }
}
