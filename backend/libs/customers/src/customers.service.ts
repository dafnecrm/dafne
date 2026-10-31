import { DatabaseService, schema } from '@app/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, isNull, like, type SQL } from 'drizzle-orm';
import {
  CUSTOMER_FILTER_FIELDS,
  type CustomerAddressBody,
  type CustomerBody,
  type CustomerDetail,
  type CustomersList,
  type ListCustomersQuery,
} from '@app/contracts';

export const DEFAULT_PAGE_SIZE = 20;

const { customer, customerAddress } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** Customers that haven't been deleted. */
const notDeleted = isNull(customer.deletedAt);

/**
 * Turns MySQL's duplicate key error on the email (drizzle wraps it as the
 * cause) into a 409; rethrows anything else.
 */
function rethrowDuplicateEmail(error: unknown): never {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (
    cause instanceof Error &&
    (cause as { code?: unknown }).code === 'ER_DUP_ENTRY' &&
    cause.message.includes('customer_email_unique_idx')
  )
    throw new ConflictException('A customer with this email already exists');
  throw error;
}

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

type Transaction = Parameters<
  Parameters<DatabaseService['db']['transaction']>[0]
>[0];

@Injectable()
export class CustomersService {
  constructor(private readonly database: DatabaseService) {}

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
    const { db } = this.database;
    const filters = CUSTOMER_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      return value ? [like(customer[field], `%${escapeLike(value)}%`)] : [];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const order = sortDirection === 'asc' ? asc : desc;

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
        .orderBy(order(customer[sortBy]), asc(customer.id))
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
  async getCustomer(id: string): Promise<CustomerDetail> {
    const found = await this.database.db.query.customer.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { createdById: false, updatedById: false },
      with: {
        addresses: {
          columns: { customerId: false, position: false },
          orderBy: { position: 'asc' },
        },
        createdBy: userSummary,
        updatedBy: userSummary,
      },
    });
    if (!found) throw new NotFoundException('Customer not found');
    return found;
  }

  /**
   * Creates a customer and their addresses; `userId` is the creator. Throws 409 if another customer (deleted ones included) has the email.
   */
  async createCustomer(
    body: CustomerBody,
    userId: string,
  ): Promise<CustomerDetail> {
    const id = randomUUID();
    // Set here, not by the column default: MySQL's now() and the driver can
    // disagree on the time zone, while dates written from JS round-trip.
    const now = new Date();
    await this.database.db
      .transaction(async (tx) => {
        await tx.insert(customer).values({
          id,
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
        });
        await insertAddresses(tx, id, body.addresses);
      })
      .catch(rethrowDuplicateEmail);
    return this.getCustomer(id);
  }

  /**
   * Replaces a customer's fields and addresses; `userId` is the editor.
   * Throws 404 if the customer doesn't exist or is deleted, 400 if the body
   * changes the type (it's chosen when the customer is created), 409 if
   * another customer has the email.
   */
  async updateCustomer(
    id: string,
    body: CustomerBody,
    userId: string,
  ): Promise<CustomerDetail> {
    await this.database.db
      .transaction(async (tx) => {
        const [result] = await tx
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
            // Set explicitly so the row always changes and is counted below.
            updatedAt: new Date(),
          })
          .where(
            and(eq(customer.id, id), notDeleted, eq(customer.type, body.type)),
          );
        if (result.affectedRows === 0) {
          // Missing (404), or there with another type (400).
          const found = await tx.query.customer.findFirst({
            where: { id, deletedAt: { isNull: true } },
            columns: { id: true },
          });
          if (!found) throw new NotFoundException('Customer not found');
          throw new BadRequestException([
            "type: The type can't be changed after the customer is created",
          ]);
        }

        await tx
          .delete(customerAddress)
          .where(eq(customerAddress.customerId, id));
        await insertAddresses(tx, id, body.addresses);
      })
      .catch(rethrowDuplicateEmail);
    return this.getCustomer(id);
  }

  /**
   * Deletes a customer logically: sets deletedAt, so they disappear from
   * the API but stay in the database. Throws 404 if already deleted.
   */
  async deleteCustomer(id: string, userId: string) {
    const now = new Date();
    const [result] = await this.database.db
      .update(customer)
      .set({ deletedAt: now, updatedAt: now, updatedById: userId })
      .where(and(eq(customer.id, id), notDeleted));
    if (result.affectedRows === 0)
      throw new NotFoundException('Customer not found');
  }
}

async function insertAddresses(
  tx: Transaction,
  customerId: string,
  addresses: CustomerAddressBody[],
) {
  if (!addresses.length) return;
  await tx.insert(customerAddress).values(
    addresses.map((address, position) => ({
      id: randomUUID(),
      customerId,
      position,
      type: address.type,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      region: address.region,
      country: address.country,
    })),
  );
}
