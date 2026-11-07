import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

// Create the Neon client lazily so Vercel can build the app before env vars are added.
export function sql(strings: TemplateStringsArray, ...values: any[]) {
  return getSql()(strings, ...values);
}

export async function ensureUser(userId: number) {
  await sql`INSERT INTO users (telegram_id) VALUES (${userId}) ON CONFLICT (telegram_id) DO NOTHING`;
  await sql`INSERT INTO cells (telegram_user_id, name, is_inbox)
    SELECT ${userId}, 'Без ячейки', TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM cells WHERE telegram_user_id = ${userId} AND is_inbox = TRUE
    )`;
}
