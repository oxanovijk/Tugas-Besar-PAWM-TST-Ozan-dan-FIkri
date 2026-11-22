import * as SecureStore from 'expo-secure-store';

import { apiOrigin, catalog } from './catalog';
import { createSessionService } from './sessionService';

const SESSION_KEY = 'jejak_session_v1';

export const accountSession = createSessionService(catalog, {
  read: () => SecureStore.getItemAsync(SESSION_KEY),
  write: (value) => SecureStore.setItemAsync(SESSION_KEY, value),
  clear: () => SecureStore.deleteItemAsync(SESSION_KEY),
}, apiOrigin);
