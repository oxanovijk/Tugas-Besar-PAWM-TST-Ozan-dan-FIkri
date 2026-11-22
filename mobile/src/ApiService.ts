export type Destination = {
  id: string;
  name: string;
  region: string;
  category: string;
  description: string;
};

export type Story = {
  id: string;
  title: string;
  category: string;
};

export type DestinationDetail = Destination & {
  latitude: number;
  longitude: number;
  visit_information: string;
  stories: Story[];
};

export type StoryDetail = Story & {
  narrative: string;
  source: string;
  destinations: Destination[];
};

export type Account = { id: string; email: string };

export type LoginResult = {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: Account;
};

type Check<T> = (value: unknown) => value is T;

function hasText(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return keys.every((key) => typeof record[key] === 'string');
}

function arrayOf<T>(value: unknown, matches: Check<T>): value is T[] {
  return Array.isArray(value) && value.every(matches);
}

function isDestination(value: unknown): value is Destination & Record<string, unknown> {
  return hasText(value, ['id', 'name', 'region', 'category', 'description']);
}

function isStory(value: unknown): value is Story & Record<string, unknown> {
  return hasText(value, ['id', 'title', 'category']);
}

function isDestinationDetail(value: unknown): value is DestinationDetail {
  return isDestination(value)
    && hasText(value, ['visit_information'])
    && typeof value.latitude === 'number' && Number.isFinite(value.latitude)
    && typeof value.longitude === 'number' && Number.isFinite(value.longitude)
    && arrayOf(value.stories, isStory);
}

function isStoryDetail(value: unknown): value is StoryDetail {
  return isStory(value) && hasText(value, ['narrative', 'source'])
    && arrayOf(value.destinations, isDestination);
}

function isAccount(value: unknown): value is Account {
  return hasText(value, ['id', 'email']);
}

function isLoginResult(value: unknown): value is LoginResult {
  return hasText(value, ['access_token', 'token_type'])
    && typeof value.access_token === 'string' && /^[A-Za-z0-9_-]+$/.test(value.access_token)
    && value.token_type === 'bearer'
    && typeof value.expires_in === 'number' && Number.isSafeInteger(value.expires_in)
    && value.expires_in > 0
    && isAccount(value.user);
}

export type CatalogFilters = { query?: string; region?: string; category?: string };

export class ApiError extends Error {
  constructor(readonly status: number, readonly retryAfter?: number) {
    super('HTTP ' + status);
    this.name = 'ApiError';
  }
}

export class InsecureAuthOriginError extends Error {
  constructor() {
    super('Login memerlukan alamat API HTTPS.');
    this.name = 'InsecureAuthOriginError';
  }
}

type RequestOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

export function normalizeApiOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '').replace(/\/api$/, '');
}

export function createApiService(
  origin: string,
  request: typeof fetch = fetch,
  allowLocalAuth = false,
) {
  const base = normalizeApiOrigin(origin);

  async function send(path: string, options: RequestOptions = {}) {
    const response = await request(base + '/api' + path, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const header = response.headers?.get('Retry-After');
      const delay = header && /^\d+$/.test(header) ? Number(header) : 0;
      throw new ApiError(response.status, delay > 0 && Number.isSafeInteger(delay) ? delay : undefined);
    }
    return response;
  }

  async function decode<T>(response: Response, matches: Check<T>): Promise<T> {
    const data: unknown = await response.json();
    if (!matches(data)) throw new Error('Format respons API tidak sesuai.');
    return data;
  }

  async function get<T>(path: string, matches: Check<T>, signal?: AbortSignal): Promise<T> {
    return decode(await send(path, { signal }), matches);
  }

  async function authRequest<T>(
    path: string,
    options: RequestOptions,
    parseResponse: (response: Response) => T | Promise<T>,
  ): Promise<T> {
    const https = /^https:\/\/[a-z0-9.-]+(?::\d{1,5})?(?:\/[^?#\s\\]*)?$/i.test(base);
    const local = /^http:\/\/(?:10\.0\.2\.2|127\.0\.0\.1|localhost)(?::\d{1,5})?(?:\/[^?#\s\\]*)?$/i.test(base);
    if (!https && !(allowLocalAuth && local)) throw new InsecureAuthOriginError();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await send(path, { ...options, signal: controller.signal, redirect: 'error' });
      return await parseResponse(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    login(email: string, password: string) {
      return authRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      }, (response) => decode(response, isLoginResult));
    },

    getAccount(token: string) {
      return authRequest('/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
      }, (response) => decode(response, isAccount));
    },

    logout(token: string) {
      return authRequest('/auth/logout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      }, (response) => {
        if (response.status !== 204) throw new Error('Respons logout tidak sesuai.');
      });
    },

    listDestinations(filters: CatalogFilters, signal?: AbortSignal) {
      const params = new URLSearchParams();
      for (const [key, value] of [
        ['q', filters.query],
        ['region', filters.region],
        ['category', filters.category],
      ] as const) {
        if (value?.trim()) params.set(key, value.trim());
      }
      const query = params.toString();
      return get('/destinations' + (query ? '?' + query : ''), (data): data is Destination[] => arrayOf(data, isDestination), signal);
    },

    getDestination(id: string, signal?: AbortSignal) {
      return get('/destinations/' + encodeURIComponent(id), isDestinationDetail, signal);
    },

    getStory(id: string, signal?: AbortSignal) {
      return get('/cultural-stories/' + encodeURIComponent(id), isStoryDetail, signal);
    },
  };
}
