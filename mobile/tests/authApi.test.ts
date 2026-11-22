import { ApiError, createApiService } from '../src/ApiService';
import { validateLogin } from '../src/loginValidation';

describe('account API', () => {
  const request = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const account = { id: 'account-demo', email: 'demo@example.test' };
  const token = 'test-session';
  const api = createApiService('https://jejaknusantara.example/api/', request);

  beforeEach(() => request.mockReset());

  it('posts login JSON and preserves the password exactly', async () => {
    request.mockResolvedValue({ ok: true, json: async () => ({
      access_token: token, token_type: 'bearer', expires_in: 3600, user: account,
    }) } as Response);

    await expect(api.login(' demo@example.test ', ' synthetic pass '))
      .resolves.toMatchObject({ access_token: token, user: account });
    expect(request).toHaveBeenCalledWith(
      'https://jejaknusantara.example/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@example.test', password: ' synthetic pass ' }),
      }),
    );
  });

  it('sends the bearer token to profile and treats logout as an empty response', async () => {
    const json = jest.fn().mockResolvedValue(account);
    request.mockResolvedValueOnce({ ok: true, json } as unknown as Response);
    request.mockResolvedValueOnce({ ok: true, status: 204, json } as unknown as Response);

    await expect(api.getAccount(token)).resolves.toEqual(account);
    await expect(api.logout(token)).resolves.toBeUndefined();
    expect(request).toHaveBeenNthCalledWith(2,
      'https://jejaknusantara.example/api/auth/logout',
      expect.objectContaining({
        method: 'POST', headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
      }),
    );
    expect(json).toHaveBeenCalledTimes(1);
  });

  it('preserves rate-limit information without reading an error body', async () => {
    const json = jest.fn();
    request.mockResolvedValue({
      ok: false, status: 429, headers: new Headers({ 'Retry-After': '30' }), json,
    } as unknown as Response);

    await expect(api.login(account.email, 'synthetic pass'))
      .rejects.toMatchObject({ name: 'ApiError', status: 429, retryAfter: 30 } satisfies Partial<ApiError>);
    expect(json).not.toHaveBeenCalled();
  });

  it('requires HTTPS for credentials except on an explicitly enabled local dev origin', async () => {
    request.mockResolvedValue({ ok: true, json: async () => account } as Response);
    await expect(createApiService('http://10.0.2.2:8080', request).getAccount(token))
      .rejects.toThrow('HTTPS');
    await expect(createApiService('http://192.168.0.8', request, true).getAccount(token))
      .rejects.toThrow('HTTPS');
    await expect(createApiService('http://10.0.2.2:8080', request, true).getAccount(token))
      .resolves.toEqual(account);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('login field limits', () => {
  it('measures the password in Unicode characters without trimming it', () => {
    expect(validateLogin('demo@example.test', ' '.repeat(15))).toEqual({});
    expect(validateLogin('demo@example.test', '😀'.repeat(128))).toEqual({});
    expect(validateLogin('demo@example.test', '😀'.repeat(129))).toHaveProperty('password');
  });
});
