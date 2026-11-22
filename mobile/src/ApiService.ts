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

export type CatalogFilters = { query?: string; region?: string; category?: string };

export class ApiError extends Error {
  constructor(readonly status: number) {
    super('HTTP ' + status);
    this.name = 'ApiError';
  }
}

export function createApiService(origin: string, request: typeof fetch = fetch) {
  const base = origin.trim().replace(/\/+$/, '').replace(/\/api$/, '');

  async function get<T>(path: string, matches: Check<T>, signal?: AbortSignal): Promise<T> {
    const response = await request(base + '/api' + path, {
      signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new ApiError(response.status);
    }
    const data: unknown = await response.json();
    if (!matches(data)) throw new Error('Format respons API tidak sesuai.');
    return data;
  }

  return {
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
