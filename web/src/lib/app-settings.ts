import { query } from "./db";

export async function getAppSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const rows = await query<Record<string, unknown>>("SELECT `value` FROM app_settings WHERE `key` = ?", [key]);
    if (rows.length === 0) return fallback;
    const raw = rows[0].value;
    // mysql2 bisa return kolom JSON sebagai object (sudah ter-parse) atau string
    if (typeof raw === "string") return JSON.parse(raw) as T;
    if (raw && typeof raw === "object") return raw as T;
    return fallback;
  } catch {
    return fallback;
  }
}

export async function setAppSetting<T>(key: string, value: T): Promise<void> {
  await query("INSERT INTO app_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [
    key,
    JSON.stringify(value),
  ]);
}
