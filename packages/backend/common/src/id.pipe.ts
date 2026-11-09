import { NotFoundException, PipeTransform } from '@nestjs/common';

/** The largest value of a Postgres integer (`serial` ids). */
const MAX_ID = 2_147_483_647;

/**
 * The `:id` of a route as a number, e.g. `@Param('id', IdPipe) id: number`.
 * Ids are positive integers (serial columns): anything else ("abc", "0",
 * "1.5") can't be a record, so it's a 404, as for an id that doesn't exist.
 */
export class IdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^[1-9]\d*$/.test(value)) throw new NotFoundException();
    const id = Number(value);
    if (id > MAX_ID) throw new NotFoundException();
    return id;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The `:id` of a route on a `uuid` column, e.g. `@Param('id', UuidPipe) id:
 * string`. Anything that isn't a uuid can't be a record (and Postgres would
 * reject it), so it's a 404.
 */
export class UuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID.test(value)) throw new NotFoundException();
    return value.toLowerCase();
  }
}

/**
 * The `:id` of a route on a `varchar` column, e.g. `@Param('id', new
 * TextIdPipe(36)) id: string`. A blank id, or one longer than the column,
 * can't be a record, so it's a 404.
 */
export class TextIdPipe implements PipeTransform<string, string> {
  private readonly maxLength: number;

  constructor(maxLength: number) {
    this.maxLength = maxLength;
  }

  transform(value: string): string {
    if (!value || value.length > this.maxLength) throw new NotFoundException();
    return value;
  }
}
