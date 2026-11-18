import { baseURLOptions } from './auth.js';

describe('baseURLOptions', () => {
  it('keeps a fixed base URL without allowed hosts', () => {
    expect(baseURLOptions('https://sales-web.dafne.localhost')).toEqual({
      baseURL: 'https://sales-web.dafne.localhost',
      trustedProxyHeaders: false,
    });
  });

  it("uses each request's host with allowed hosts, the base URL as fallback", () => {
    expect(baseURLOptions('https://sales-web.dafne.localhost', ['*.dafne.localhost'])).toEqual({
      baseURL: {
        allowedHosts: ['*.dafne.localhost'],
        fallback: 'https://sales-web.dafne.localhost',
        protocol: 'auto',
      },
      trustedProxyHeaders: true,
    });
  });
});
