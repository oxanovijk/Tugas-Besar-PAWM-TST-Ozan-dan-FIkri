import { ApiError, normalizeApiOrigin, type Account, type createApiService } from './ApiService';

type AuthApi = Pick<ReturnType<typeof createApiService>, 'login' | 'getAccount' | 'logout'>;

type Storage = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  clear: () => Promise<void>;
};

type Session = {
  token: string;
  expiresAt: number;
  origin: string;
};

export type AccountSession =
  | { status: 'signedOut'; message?: string }
  | { status: 'signedIn'; user: Account; session: Session };

export const expiredSession = { status: 'signedOut', message: 'Sesi berakhir. Silakan masuk lagi.' } as const;

export class SessionStorageError extends Error {
  constructor() {
    super('Sesi tidak dapat disimpan di perangkat. Coba lagi.');
    this.name = 'SessionStorageError';
  }
}

function readSession(raw: string): Session | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const session = value as Partial<Session>;
    const { token, expiresAt, origin } = session;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+$/.test(token)
      || typeof origin !== 'string' || typeof expiresAt !== 'number'
      || !Number.isFinite(expiresAt)) return null;
    return { token, expiresAt, origin };
  } catch {
    return null;
  }
}

export function createSessionService(api: AuthApi, storage: Storage, origin: string, now = Date.now) {
  const apiScope = normalizeApiOrigin(origin);

  return {
    async signIn(email: string, password: string): Promise<AccountSession> {
      const { user, access_token, expires_in } = await api.login(email, password);
      const session = { token: access_token, expiresAt: now() + expires_in * 1000, origin: apiScope };
      try {
        await storage.write(JSON.stringify(session));
      } catch {
        void api.logout(session.token).catch(() => undefined);
        throw new SessionStorageError();
      }
      return { status: 'signedIn', user, session };
    },

    async restore(): Promise<AccountSession> {
      const stored = await storage.read();
      if (stored === null) return { status: 'signedOut' };

      const session = readSession(stored);
      if (!session || session.origin !== apiScope || session.expiresAt <= now()) {
        await storage.clear();
        return expiredSession;
      }

      try {
        const user = await api.getAccount(session.token);
        if (session.expiresAt <= now()) {
          await storage.clear();
          return expiredSession;
        }
        return { status: 'signedIn', user, session };
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        await storage.clear();
        return expiredSession;
      }
    },

    async signOut(session: Session): Promise<AccountSession> {
      await storage.clear();
      if (session.origin !== apiScope || session.expiresAt <= now()) return { status: 'signedOut' };

      try {
        await api.logout(session.token);
        return { status: 'signedOut' };
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return { status: 'signedOut' };
        return {
          status: 'signedOut',
          message: 'Anda sudah keluar di perangkat ini. Server belum dapat mengakhiri sesi.',
        };
      }
    },
  };
}
