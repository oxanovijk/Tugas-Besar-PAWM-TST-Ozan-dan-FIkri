import { ApiError } from '../src/ApiService';
import { createSessionService } from '../src/sessionService';

describe('Expo account session', () => {
  const now = 1_000_000;
  const user = { id: 'account-demo', email: 'demo@example.test' };
  const saved = { token: 'test-session', expiresAt: now + 3600_000, origin: 'https://jejaknusantara.example' };
  const api = {
    login: jest.fn(),
    getAccount: jest.fn(),
    logout: jest.fn(),
  };
  const storage = {
    read: jest.fn(),
    write: jest.fn(),
    clear: jest.fn(),
  };
  const service = createSessionService(api, storage, saved.origin, () => now);

  beforeEach(() => {
    jest.resetAllMocks();
    api.getAccount.mockResolvedValue(user);
  });

  it('stores a scoped token and expiry without saving the password or profile', async () => {
    api.login.mockResolvedValue({
      access_token: saved.token, expires_in: 3600, token_type: 'bearer', user,
    });

    await expect(service.signIn(user.email, 'synthetic password')).resolves.toEqual({
      status: 'signedIn', user, session: saved,
    });
    expect(JSON.parse(storage.write.mock.calls[0][0])).toEqual(saved);
  });

  it('validates a stored token with the backend before restoring the account', async () => {
    storage.read.mockResolvedValue(JSON.stringify(saved));
    await expect(service.restore()).resolves.toEqual({ status: 'signedIn', user, session: saved });
    expect(api.getAccount).toHaveBeenCalledWith(saved.token);
  });

  it('clears expired or differently scoped tokens without sending them to the backend', async () => {
    for (const invalid of [
      { ...saved, expiresAt: now },
      { ...saved, origin: 'https://other.example' },
    ]) {
      storage.read.mockResolvedValueOnce(JSON.stringify(invalid));
      await expect(service.restore()).resolves.toMatchObject({ status: 'signedOut' });
    }
    expect(api.getAccount).not.toHaveBeenCalled();
    expect(storage.clear).toHaveBeenCalledTimes(2);
  });

  it('clears a revoked token, but retains the stored session on a temporary network error', async () => {
    storage.read.mockResolvedValue(JSON.stringify(saved));
    api.getAccount.mockRejectedValueOnce(new Error('network'));
    await expect(service.restore()).rejects.toThrow('network');
    expect(storage.clear).not.toHaveBeenCalled();

    api.getAccount.mockRejectedValueOnce(new ApiError(401));
    await expect(service.restore()).resolves.toMatchObject({ status: 'signedOut' });
    expect(storage.clear).toHaveBeenCalledTimes(1);
  });

  it('clears the device on logout even if the server cannot be reached', async () => {
    api.logout.mockRejectedValueOnce(new Error('network'));
    await expect(service.signOut(saved)).resolves.toMatchObject({
      status: 'signedOut', message: expect.any(String),
    });
    expect(storage.clear).toHaveBeenCalledTimes(1);
    expect(api.logout).toHaveBeenCalledWith(saved.token);
  });
});
