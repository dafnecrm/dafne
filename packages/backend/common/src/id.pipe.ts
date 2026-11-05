import { NotFoundException, PipeTransform } from '@nestjs/common';

/** The largest value of a Postgres integer (the ids are `serial`). */
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
