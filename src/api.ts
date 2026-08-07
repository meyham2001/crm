export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiRequestError(body.error || `Request failed (${res.status})`, res.status);
  return body as T;
}
