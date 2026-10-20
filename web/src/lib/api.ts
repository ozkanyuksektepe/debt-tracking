// Sunucu tarafında .NET API'ye istek atar. Yalnızca Server Component ve Server Action'lardan kullanılır.

const BASE = process.env.API_URL ?? "http://localhost:5080";

export class ApiUnavailableError extends Error {}

export async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, { cache: "no-store" });
  } catch {
    throw new ApiUnavailableError(`Backend'e ulaşılamadı (${BASE}). .NET API çalışıyor mu?`);
  }
  if (!res.ok) throw new Error(`API isteği başarısız: ${path} (${res.status})`);
  return res.json() as Promise<T>;
}

export async function apiSend(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (res.ok) return {};
    const json = await res.json().catch(() => null);
    return { error: json?.error ?? json?.title ?? `İstek başarısız (${res.status})` };
  } catch {
    return { error: "Backend'e ulaşılamadı. .NET API çalışıyor mu?" };
  }
}
