import { msg } from '@dafne/contracts';
import { BadRequestException } from '@nestjs/common';
import { CronExpressionParser } from 'cron-parser';

/** Whether `timezone` is an IANA time zone (Europe/Rome, UTC). */
export function isTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Whether `cron` is a cron pattern BullMQ can schedule (it uses cron-parser too). */
export function isCron(cron: string, timezone: string): boolean {
  try {
    CronExpressionParser.parse(cron, { tz: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Throws a 400 when the time zone or the cron pattern (if any) isn't valid. */
export function checkSchedule(cron: string | null, timezone: string): void {
  if (!isTimeZone(timezone)) {
    throw new BadRequestException(msg('tasks.timezone.invalid'));
  }
  if (cron !== null && !isCron(cron, timezone)) {
    throw new BadRequestException(msg('tasks.cron.invalid'));
  }
}
