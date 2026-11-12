import type { SessionUser, UserSession } from '@dafne/backend-session';

/**
 * Who performs a write: the signed-in user. Services get the whole user,
 * not only its id, so a write can use more of it (name, role, apps)
 * without changing its signature.
 */
export type Actor = SessionUser;

/**
 * The service of a CRUD resource: the same five methods for every
 * resource, so code (and the CLI) can work on any of them. `Id` is the
 * type of its `:id` (number for serial ids, string for uuid or text ids).
 * A resource without some of them implements a `Pick` of it, e.g.
 * `Pick<CrudService<…>, 'list' | 'get'>`.
 */
export interface CrudService<Id, Query, List, Body, Detail> {
  /** A page of records, filtered and sorted by `query`. */
  list(query?: Query): Promise<List>;
  /** One record; NotFoundException if it doesn't exist (or is deleted). */
  get(id: Id): Promise<Detail>;
  create(body: Body, actor: Actor): Promise<Detail>;
  update(id: Id, body: Body, actor: Actor): Promise<Detail>;
  /** Logical delete. */
  delete(id: Id, actor: Actor): Promise<void>;
}

/**
 * The controller of a CRUD resource, mapped to the routes:
 * `GET /` list, `GET /:id` get, `POST /` create, `PUT /:id` update,
 * `DELETE /:id` delete (204). Extra routes (e.g. `PATCH /:id/close`) sit
 * next to them, with their own names.
 */
export interface CrudController<Id, Query, List, Body, Detail> {
  list(query: Query): Promise<List>;
  get(id: Id): Promise<Detail>;
  create(body: Body, session: UserSession): Promise<Detail>;
  update(id: Id, body: Body, session: UserSession): Promise<Detail>;
  delete(id: Id, session: UserSession): Promise<void>;
}
