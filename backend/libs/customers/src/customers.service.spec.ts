import { DatabaseService, schema } from '@app/database';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull, like } from 'drizzle-orm';
import { customerBodySchema, type CustomerBodyInput } from '@app/contracts';
import { CustomersService } from './customers.service.js';

/** A body as the validation pipe hands it to the service. */
const body = (input: CustomerBodyInput) => customerBodySchema.parse(input);

const { customer, customerAddress } = schema;
const notDeleted = isNull(customer.deletedAt);

describe('CustomersService', () => {
  let service: CustomersService;
  const rows = [{ id: 'c1', name: 'Acme' }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  // Stand-ins for insert().values(), update().set().where(), delete().where()
  const insert = { values: vi.fn() };
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
  const found = { id: 'c1', name: 'Acme', addresses: [] };
  // What drizzle throws when the unique email index rejects a row.
  const duplicateEmail = new Error('Failed query', {
    cause: Object.assign(
      new Error(
        "Duplicate entry 'info@acme.test' for key 'customer.customer_email_unique_idx'",
      ),
      { code: 'ER_DUP_ENTRY' },
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
    insert.values.mockResolvedValue(undefined);
    db.update.mockReturnValue(update);
    update.set.mockReturnValue(update);
    update.where.mockResolvedValue([{ affectedRows: 1 }]);
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
        { provide: DatabaseService, useValue: { db } },
      ],
    }).compile();

    service = module.get(CustomersService);
  });

  describe('listCustomers', () => {
    it('lists customers that are not deleted, by name', async () => {
      await expect(service.listCustomers()).resolves.toEqual({
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
        asc(customer.name),
        asc(customer.id),
      );
    });

    it('filters with contains, escaping LIKE wildcards', async () => {
      await service.listCustomers({ name: '50%_a', phone: ' 333 ', email: '' });

      expect(select.where).toHaveBeenCalledWith(
        and(
          notDeleted,
          like(customer.name, '%50\\%\\_a%'),
          like(customer.phone, '%333%'),
        ),
      );
    });

    it('pages and sorts', async () => {
      await service.listCustomers({
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

  describe('getCustomer', () => {
    it('returns a customer that is not deleted, with addresses and users', async () => {
      await expect(service.getCustomer('c1')).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 'c1', deletedAt: { isNull: true } });
      expect(options.with).toHaveProperty('addresses');
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the customer does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.getCustomer('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createCustomer', () => {
    it('inserts the customer and its addresses in order', async () => {
      await expect(
        service.createCustomer(
          body({
            type: 'company',
            name: 'Acme',
            email: 'info@acme.test',
            addresses: [
              { street: 'Via Roma 1', city: 'Milano', country: 'Italy' },
              {
                street: 'Main St 2',
                city: 'Boston',
                country: 'USA',
                type: 'head_office',
              },
            ],
          }),
          'u1',
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
        { customerId: customerRow.id, position: 0, city: 'Milano', type: null },
        {
          customerId: customerRow.id,
          position: 1,
          city: 'Boston',
          type: 'head_office',
        },
      ]);
      expect(findFirst.mock.calls[0][0].where.id).toBe(customerRow.id);
    });

    it('throws 409 when another customer has the email', async () => {
      insert.values.mockRejectedValue(duplicateEmail);

      await expect(
        service.createCustomer(
          body({ type: 'company', name: 'Acme', email: 'info@acme.test' }),
          'u1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('skips the address insert when there are none', async () => {
      await service.createCustomer(
        body({ type: 'company', name: 'Acme', email: 'info@acme.test' }),
        'u1',
      );

      expect(insert.values).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateCustomer', () => {
    it('updates the customer and replaces the addresses', async () => {
      await service.updateCustomer(
        'c1',
        body({
          type: 'company',
          name: 'Acme Inc',
          email: 'info@acme.test',
          addresses: [
            { street: 'Via Roma 1', city: 'Milano', country: 'Italy' },
          ],
        }),
        'u2',
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        name: 'Acme Inc',
        email: 'info@acme.test',
        phone: null,
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(customer.id, 'c1'), notDeleted, eq(customer.type, 'company')),
      );
      expect(db.delete).toHaveBeenCalledWith(customerAddress);
      expect(remove.where).toHaveBeenCalledWith(
        eq(customerAddress.customerId, 'c1'),
      );
      expect(insert.values.mock.calls[0][0]).toMatchObject([
        { customerId: 'c1', position: 0 },
      ]);
    });

    it('throws 409 when another customer has the email', async () => {
      update.where.mockRejectedValue(duplicateEmail);

      await expect(
        service.updateCustomer(
          'c1',
          body({ type: 'company', name: 'Acme', email: 'info@acme.test' }),
          'u2',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 400 and changes nothing when the type changes', async () => {
      update.where.mockResolvedValue([{ affectedRows: 0 }]);
      findFirst.mockResolvedValue({ id: 'c1' });

      await expect(
        service.updateCustomer(
          'c1',
          body({
            type: 'person',
            name: 'Mario Rossi',
            email: 'info@acme.test',
          }),
          'u2',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.delete).not.toHaveBeenCalled();
      expect(insert.values).not.toHaveBeenCalled();
    });

    it('throws 404 and changes nothing when the customer is missing', async () => {
      update.where.mockResolvedValue([{ affectedRows: 0 }]);
      findFirst.mockResolvedValue(undefined);

      await expect(
        service.updateCustomer(
          'nope',
          body({ type: 'company', name: 'X', email: 'info@acme.test' }),
          'u2',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.delete).not.toHaveBeenCalled();
      expect(insert.values).not.toHaveBeenCalled();
    });
  });

  describe('deleteCustomer', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.deleteCustomer('c1', 'u3');

      const values = update.set.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedById).toBe('u3');
      expect(update.where).toHaveBeenCalledWith(
        and(eq(customer.id, 'c1'), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the customer is missing or already deleted', async () => {
      update.where.mockResolvedValue([{ affectedRows: 0 }]);

      await expect(service.deleteCustomer('c1', 'u3')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
