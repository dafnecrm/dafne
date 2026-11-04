import { localeFrom, translate } from './i18n.js';

describe('localeFrom', () => {
  it('picks the best supported language', () => {
    expect(localeFrom('fr-FR,en-GB;q=0.8,it;q=0.5')).toBe('en');
    expect(localeFrom('en;q=0.2,it-IT')).toBe('it');
  });

  it('falls back to Italian', () => {
    expect(localeFrom(undefined)).toBe('it');
    expect(localeFrom('de,fr')).toBe('it');
  });
});

describe('translate', () => {
  it('translates a key, also after a path', () => {
    expect(translate('customers.notFound', 'it')).toBe('Cliente non trovato');
    expect(
      translate('addresses.0.city: customerAddresses.city.required', 'en'),
    ).toBe('addresses.0.city: Enter the city');
  });

  it('leaves other text unchanged', () => {
    expect(translate('name: Too big', 'it')).toBe('name: Too big');
    expect(translate('Unauthorized', 'it')).toBe('Unauthorized');
  });
});
