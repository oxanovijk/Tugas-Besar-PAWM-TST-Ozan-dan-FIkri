import { ApiError, createApiService } from '../src/ApiService';
import { validateLogin } from '../src/loginValidation';

describe('JejakNusantara API', () => {
  const request = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const api = createApiService('http://localhost:8080/', request);

  beforeEach(() => request.mockReset());

  it('encodes catalog filters and preserves the cancellation signal', async () => {
    request.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    const signal = new AbortController().signal;

    await expect(api.listDestinations({ query: '  lentera & tari ', region: 'Jawa Barat' }, signal))
      .resolves.toEqual([]);
    expect(request).toHaveBeenCalledWith(
      'http://localhost:8080/api/destinations?q=lentera+%26+tari&region=Jawa+Barat',
      { signal, headers: { Accept: 'application/json' } },
    );
  });

  it('uses the published story endpoint with an encoded ID', async () => {
    request.mockResolvedValue({
      ok: true, json: async () => ({
        id: 'tradisi-lentera', title: 'Tradisi Lentera', category: 'Tradisi',
        narrative: 'Kisah demo.', source: 'Data uji.', destinations: [],
      }),
    } as Response);

    await expect(api.getStory('tradisi/lentera')).resolves.toMatchObject({ destinations: [] });
    expect(request.mock.calls[0][0]).toBe('http://localhost:8080/api/cultural-stories/tradisi%2Flentera');
  });

  it('rejects 2xx responses with an invalid catalog structure', async () => {
    request.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) } as Response);

    await expect(api.listDestinations({})).rejects.toThrow();
  });

  it('rejects 2xx story responses that omit the related list', async () => {
    request.mockResolvedValue({
      ok: true, json: async () => ({
        id: 'tradisi-lentera', title: 'Tradisi Lentera', category: 'Tradisi',
        narrative: 'Kisah demo.', source: 'Data uji.',
      }),
    } as Response);

    await expect(api.getStory('tradisi-lentera')).rejects.toThrow();
  });

  it('keeps a not-found status for an unavailable destination', async () => {
    request.mockResolvedValue({ ok: false, status: 404 } as Response);

    await expect(api.getDestination('hilang')).rejects.toMatchObject({
      name: 'ApiError', status: 404,
    } satisfies Partial<ApiError>);
  });
});

describe('login form', () => {
  it('identifies both required fields', () => {
    expect(validateLogin(' ', '')).toEqual({
      email: 'Masukkan email.',
      password: 'Masukkan kata sandi.',
    });
  });

  it('reports an invalid email', () => {
    expect(validateLogin('jejak', 'kata-sandi')).toEqual({
      email: 'Masukkan alamat email yang valid.',
    });
  });

  it('accepts a valid email with surrounding spaces and a nonempty password', () => {
    expect(validateLogin(' demo@example.test ', 'contoh')).toEqual({});
  });
});
