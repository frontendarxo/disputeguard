/**
 * Minimal PayPal REST client for the sandbox environment.
 * Reads credentials lazily from process.env so it works both in Next.js
 * and in standalone scripts.
 */

const BASE_URLS = {
  sandbox: "https://api-m.sandbox.paypal.com",
} as const;

type PayPalEnv = keyof typeof BASE_URLS;

export class PayPalConfigError extends Error {}

export class PayPalApiError extends Error {
  readonly status: number;
  readonly debugId?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, debugId?: string, details?: unknown) {
    super(message);
    this.name = "PayPalApiError";
    this.status = status;
    this.debugId = debugId;
    this.details = details;
  }
}

export function getPayPalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const env = (process.env.PAYPAL_ENV?.trim() || "sandbox") as PayPalEnv;

  if (!clientId || !clientSecret) {
    throw new PayPalConfigError(
      "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set (see .env.example).",
    );
  }
  if (!(env in BASE_URLS)) {
    throw new PayPalConfigError(
      `PAYPAL_ENV="${env}" is not allowed. This project runs on the PayPal sandbox only.`,
    );
  }

  return { clientId, clientSecret, env, baseUrl: BASE_URLS[env] };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const { clientId, clientSecret, baseUrl } = getPayPalConfig();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new PayPalApiError(
      `Failed to get PayPal access token (HTTP ${res.status}).`,
      res.status,
      res.headers.get("paypal-debug-id") ?? undefined,
      body,
    );
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh one minute before the token actually expires.
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

export async function paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl } = getPayPalConfig();
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      // For multipart uploads, fetch sets the Content-Type (with boundary) itself.
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    const message =
      (body as { message?: string } | undefined)?.message ??
      `PayPal API request failed: ${init.method ?? "GET"} ${path}`;
    throw new PayPalApiError(
      `${message} (HTTP ${res.status})`,
      res.status,
      res.headers.get("paypal-debug-id") ?? undefined,
      body,
    );
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
