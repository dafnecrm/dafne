import { checkTaskOptions } from './tasks.registry.js';

describe('checkTaskOptions', () => {
  it('accepts dot-separated lowercase keys with valid defaults', () => {
    expect(() => checkTaskOptions({ key: 'quotations.expire-old', cron: '0 2 * * *', timeoutSeconds: 60 })).not.toThrow();
    expect(() => checkTaskOptions({ key: 'cleanup' })).not.toThrow();
  });

  it('rejects bad keys, patterns, time zones and timeouts', () => {
    expect(() => checkTaskOptions({ key: 'Quotations.Expire' })).toThrow(/key/);
    expect(() => checkTaskOptions({ key: 'a.', cron: '0 2 * * *' })).toThrow(/key/);
    expect(() => checkTaskOptions({ key: 'a.b', cron: 'daily' })).toThrow(/cron/);
    expect(() => checkTaskOptions({ key: 'a.b', timezone: 'Nowhere' })).toThrow(/time zone/);
    expect(() => checkTaskOptions({ key: 'a.b', timeoutSeconds: 0 })).toThrow(/timeout/);
  });
});
