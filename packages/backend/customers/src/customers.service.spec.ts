import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull, ilike } from 'drizzle-orm';
import { customerBodySchema, type CustomerBodyInput } from '@dafne/contracts';
import { CustomersService } from './customers.service.js';
import { CrudHooksRegistry, type Actor } from '@dafne/backend-crud';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

/** A body as the validation pipe hands it to the service. */
const body = (input: CustomerBodyInput) => customerBodySchema.parse(input);

const { customer, customerAddress } = schema;
const notDeleted = isNull(customer.deletedAt);

describe('CustomersService', () => {
  let service: CustomersService;
  const rows = [{ id: 1, name: 'Acme' }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  // Stand-ins for insert().values().returning(), update().set().where(), delete().where()
  const insert = { values: vi.fn(), returning: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn() };
  const remove = { where: vi.fn() };
  const findFirst = vi.fn();
  const db = {
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
    query: { customer: { findFirst } },
  };
  const found = { id: 1, name: 'Acme', addresses: [] };
  // What drizzle throws when the unique email index rejects a row.
  const duplicateEmail = new Error('Failed query', {
    cause: Object.assign(
      new Error(
        'duplicate key value violates unique constraint "customer_email_unique_idx"',
      ),
      { code: '23505', constraint: 'customer_email_unique_idx' },
    ),
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    db.select.mockReturnValue(select);
    select.from.mockReturnValue(select);
    select.where.mockReturnValue(select);
    select.orderBy.mockReturnValue(select);
    select.limit.mockReturnValue(select);
    select.offset.mockResolvedValue(rows);
    db.$count.mockResolvedValue(42);
    db.insert.mockReturnValue(insert);
    insert.values.mockReturnValue(insert);
    insert.returning.mockResolvedValue([{ id: 1 }]);
    db.update.mockReturnValue(update);
    update.set.mockReturnValue(update);
    update.where.mockResolvedValue({ rowCount: 1 });
    db.delete.mockReturnValue(remove);
    remove.where.mockResolvedValue(undefined);
    // The transaction runs on the same mock db.
    db.transaction.mockImplementation((run: (tx: typeof db) => unknown) =>
      run(db),
    );
    findFirst.mockResolvedValue(found);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getDrizzleToken(), useValue: db },
        CrudHooksRegistry,
      ],
    }).compile();

    service = module.get(CustomersService);
  });

  describe('list', () => {
    it('lists customers that are not deleted, newest first', async () => {
      await expect(service.list()).resolves.toEqual({
        customers: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(customer);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(customer, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        desc(customer.id),
        asc(customer.id),
      );
    });

    it('filters with contains, escaping LIKE wildcards', async () => {
      await service.list({ name: '50%_a', phone: ' 333 ', email: '' });

      expect(select.where).toHaveBeenCalledWith(
        and(
          notDeleted,
          ilike(customer.name, '%50\\%\\_a%'),
          ilike(customer.phone, '%333%'),
        ),
      );
    });

    it('pages and sorts', async () => {
      await service.list({
        limit: 5,
        offset: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(select.orderBy).toHaveBeenCalledWith(
        desc(customer.createdAt),
        asc(customer.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('get', () => {
    it('returns a customer that is not deleted, with addresses and users', async () => {
      await expect(service.get(1)).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with).toHaveProperty('addresses');
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the customer does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.get(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('inserts the customer and its addresses in order', async () => {
      await expect(
        service.create(
          body({
            type: 'company',
            name: 'Acme',
            email: 'info@acme.test',
            addresses: [
              {
                type: 'billing',
                street: 'Via Roma 1',
                city: 'Milano',
                countryCode: 'IT',
              },
              {
                street: 'Main St 2',
                city: 'Boston',
                countryCode: 'US',
                type: 'head_office',
              },
            ],
          }),
          actor('u1'),
        ),
      ).resolves.toBe(found);

      const [customerRow] = insert.values.mock.calls[0];
      expect(customerRow).toMatchObject({
        name: 'Acme',
        email: 'info@acme.test',
        phone: null,
        createdById: 'u1',
        updatedById: 'u1',
      });

      const [addressRows] = insert.values.mock.calls[1];
      expect(addressRows).toMatchObject([
        {
          customerId: 1,
          position: 0,
          city: 'Milano',
          type: 'billing',
        },
        {
          customerId: 1,
          position: 1,
          city: 'Boston',
          type: 'head_office',
        },
      ]);
      expect(findFirst.mock.calls[0][0].where.id).toBe(1);
    });

    it('throws 409 when another customer has the email', async () => {
      insert.returning.mockRejectedValue(duplicateEmail);

      await expect(
        service.create(
          body({ type: 'company', name: 'Acme', email: 'info@acme.test' }),
          actor('u1'),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws 400 when an address country is not in the countries table', async () => {
      // The customer row goes in; its address fails the foreign key.
      insert.values.mockReturnValueOnce(insert).mockRejectedValueOnce(
        new Error('Failed query', {
          cause: Object.assign(
            new Error(
              'insert or update on table "customer_address" violates foreign key constraint "customer_address_country_code_country_id_fkey"',
            ),
            {
              code: '23503',
              constraint: 'customer_address_country_code_country_id_fkey',
            },
          ),
        }),
      );

      await expect(
        service.create(
          body({
            type: 'company',
            name: 'Acme',
            email: 'info@acme.test',
            addresses: [
              {
                type: 'billing',
                street: 'Via Roma 1',
                city: 'Milano',
                countryCode: 'XX',
              },
            ],
          }),
          actor('u1'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('skips the address insert when there are none', async () => {
      await service.create(
        body({ type: 'company', name: 'Acme', email: 'info@acme.test' }),
        actor('u1'),
      );

      expect(insert.values).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('updates the customer and replaces the addresses', async () => {
      await service.update(
        1,
        body({
          type: 'company',
          name: 'Acme Inc',
          email: 'info@acme.test',
          addresses: [
            {
              type: 'billing',
              street: 'Via Roma 1',
              city: 'Milano',
              countryCode: 'IT',
            },
          ],
        }),
        actor('u2'),
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        name: 'Acme Inc',
        email: 'info@acme.test',
        phone: null,
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(customer.id, 1), notDeleted, eq(customer.type, 'company')),
      );
      expect(db.delete).toHaveBeenCalledWith(customerAddress);
      expect(remove.where).toHaveBeenCalledWith(
        eq(customerAddress.customerId, 1),
      );
      expect(insert.values.mock.calls[0][0]).toMatchObject([
        { customerId: 1, position: 0 },
      ]);
    });

    it('throws 409 when another customer has the email', async () => {
      update.where.mockRejectedValue(duplicateEmail);

      await expect(
        service.update(
          1,
          body({ type: 'company', name: 'Acme', email: 'info@acme.test' }),
          actor('u2'),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 400 and changes nothing when the type changes', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });
      findFirst.mockResolvedValue({ id: 1 });

      await expect(
        service.update(
          1,
          body({
            type: 'person',
            name: 'Mario Rossi',
            email: 'info@acme.test',
          }),
          actor('u2'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.delete).not.toHaveBeenCalled();
      expect(insert.values).not.toHaveBeenCalled();
    });

    it('throws 404 and changes nothing when the customer is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });
      findFirst.mockResolvedValue(undefined);

      await expect(
        service.update(
          999,
          body({ type: 'company', name: 'X', email: 'info@acme.test' }),
          actor('u2'),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.delete).not.toHaveBeenCalled();
      expect(insert.values).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.delete(1, actor('u3'));

      const values = update.set.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedById).toBe('u3');
      expect(update.where).toHaveBeenCalledWith(
        and(eq(customer.id, 1), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the customer is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.delete(1, actor('u3'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
