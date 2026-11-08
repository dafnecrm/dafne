import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, isNull, ilike, type SQL } from 'drizzle-orm';
import {
  CUSTOMER_FILTER_FIELDS,
  type CustomerAddressBody,
  type CustomerBody,
  type CustomerDetail,
  type CustomersList,
  type ListCustomersQuery,
  msg,
} from '@dafne/contracts';
import { PostgresErrorCode } from '@dafne/backend-common';

export const DEFAULT_PAGE_SIZE = 20;

const { customer, customerAddress } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** Customers that haven't been deleted. */
const notDeleted = isNull(customer.deletedAt);

/**
 * Turns the Postgres errors a body can cause (drizzle wraps them as the
 * cause) into client errors: a taken email (409), an address country that
 * isn't in the countries table (400). Rethrows anything else.
 */
function rethrowConstraint(error: unknown): never {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  const { code, constraint } =
    cause instanceof Error
      ? (cause as { code?: unknown; constraint?: unknown })
      : {};
  const name = typeof constraint === 'string' ? constraint : '';
  if (code === PostgresErrorCode.UNIQUE_VIOLATION && name === 'customer_email_unique_idx')
    throw new ConflictException(msg('customers.email.taken'));
  if (code === PostgresErrorCode.FOREIGN_KEY_VIOLATION && name.includes('country_code'))
    throw new BadRequestException([
      `addresses: ${msg('customers.addresses.country')}`,
    ]);
  throw error;
}

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class CustomersService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Lists customers that aren't deleted, paged and sorted, filtered by every
   * field given (AND, each matching text the field contains).
   */
  async listCustomers(query: ListCustomersQuery = {}): Promise<CustomersList> {
    const {
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'name',
      sortDirection = 'asc',
    } = query;
    const { db } = this;
    const filters = CUSTOMER_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) return [];
      // The id matches exactly (an integer column), the other fields contain the text.
      return [
        field === 'id'
          ? eq(customer.id, Number(value))
          : ilike(customer[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [customers, total] = await Promise.all([
      db
        .select({
          id: customer.id,
          type: customer.type,
          name: customer.name,
          birthDate: customer.birthDate,
          fiscalCode: customer.fiscalCode,
          vatNumber: customer.vatNumber,
          email: customer.email,
          phone: customer.phone,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        })
        .from(customer)
        .where(where)
        .orderBy(direction(customer[sortBy]), asc(customer.id))
        .limit(limit)
        .offset(offset),
      db.$count(customer, where),
    ]);

    return { customers, total, limit, offset };
  }

  /**
   * One customer that isn't deleted, with their addresses and who created
   * and last updated them. Throws 404 otherwise.
   */
  async getCustomer(id: number): Promise<CustomerDetail> {
    const found = await this.db.query.customer.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        addresses: {
          columns: { customerId: false, position: false },
          orderBy: { position: 'asc' },
          with: { country: { columns: { name: true } } },
        },
        createdBy: userSummary,
        updatedBy: userSummary,
      },
    });
    if (!found) throw new NotFoundException(msg('customers.notFound'));
    return found;
  }

  /**
   * Creates a customer and their addresses; `userId` is the creator. Throws 409 if another customer (deleted ones included) has the email.
   */
  async createCustomer(
    body: CustomerBody,
    userId: string,
  ): Promise<CustomerDetail> {
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    const id = await this.db
      .transaction(async (tx) => {
        const [created] = await tx
          .insert(customer)
          .values({
            type: body.type,
            name: body.name,
            birthDate: body.birthDate,
            fiscalCode: body.fiscalCode,
            vatNumber: body.vatNumber,
            email: body.email,
            phone: body.phone,
            createdAt: now,
            updatedAt: now,
            createdById: userId,
            updatedById: userId,
          })
          .returning({ id: customer.id });
        await insertAddresses(tx, created.id, body.addresses);
        return created.id;
      })
      .catch(rethrowConstraint);
    return this.getCustomer(id);
  }

  /**
   * Replaces a customer's fields and addresses; `userId` is the editor.
   * Throws 404 if the customer doesn't exist or is deleted, 400 if the body
   * changes the type (it's chosen when the customer is created), 409 if
   * another customer has the email.
   */
  async updateCustomer(
    id: number,
    body: CustomerBody,
    userId: string,
  ): Promise<CustomerDetail> {
    await this.db
      .transaction(async (tx) => {
        const result = await tx
          .update(customer)
          .set({
            // Same as before: the where below only matches the saved type.
            type: body.type,
            name: body.name,
            birthDate: body.birthDate,
            fiscalCode: body.fiscalCode,
            vatNumber: body.vatNumber,
            email: body.email,
            phone: body.phone,
            updatedById: userId,
            // The time of this change.
            updatedAt: new Date(),
          })
          .where(
            and(eq(customer.id, id), notDeleted, eq(customer.type, body.type)),
          );
        if (result.rowCount === 0) {
          // Missing (404), or there with another type (400).
          const found = await tx.query.customer.findFirst({
            where: { id, deletedAt: { isNull: true } },
            columns: { id: true },
          });
          if (!found) throw new NotFoundException(msg('customers.notFound'));
          throw new BadRequestException([
            `type: ${msg('customers.type.locked')}`,
          ]);
        }

        await tx
          .delete(customerAddress)
          .where(eq(customerAddress.customerId, id));
        await insertAddresses(tx, id, body.addresses);
      })
      .catch(rethrowConstraint);
    return this.getCustomer(id);
  }

  /**
   * Deletes a customer logically: sets deletedAt, so they disappear from
   * the API but stay in the database. Throws 404 if already deleted.
   */
  async deleteCustomer(id: number, userId: string) {
    const now = new Date();
    const result = await this.db
      .update(customer)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(and(eq(customer.id, id), notDeleted));
    if (result.rowCount === 0)
      throw new NotFoundException(msg('customers.notFound'));
  }
}

async function insertAddresses(
  tx: Transaction,
  customerId: number,
  addresses: CustomerAddressBody[],
) {
  if (!addresses.length) return;
  await tx.insert(customerAddress).values(
    addresses.map((address, position) => ({
      customerId,
      position,
      type: address.type,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      region: address.region,
      countryCode: address.countryCode,
    })),
  );
}
