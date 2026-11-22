import { createApiService } from './ApiService';

export const apiOrigin = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080';

export const catalog = createApiService(apiOrigin, fetch, __DEV__);
