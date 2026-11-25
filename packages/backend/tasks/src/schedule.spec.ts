import { BadRequestException } from '@nestjs/common';
import { checkSchedule, isCron, isTimeZone } from './schedule.js';

describe('schedule', () => {
  it('knows time zones', () => {
    expect(isTimeZone('Europe/Rome')).toBe(true);
    expect(isTimeZone('UTC')).toBe(true);
    expect(isTimeZone('Mars/Olympus')).toBe(false);
  });

  it('knows cron patterns', () => {
    expect(isCron('0 3 * * *', 'UTC')).toBe(true);
    expect(isCron('*/5 * * * *', 'Europe/Rome')).toBe(true);
    expect(isCron('every day', 'UTC')).toBe(false);
    expect(isCron('99 * * * *', 'UTC')).toBe(false);
  });

  it('rejects a bad time zone or pattern with a 400, and allows no pattern', () => {
    expect(() => checkSchedule('0 3 * * *', 'Mars/Olympus')).toThrow(BadRequestException);
    expect(() => checkSchedule('nope', 'UTC')).toThrow('tasks.cron.invalid');
    expect(() => checkSchedule(null, 'UTC')).not.toThrow();
  });
});
