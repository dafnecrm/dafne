import {
  quotationBodySchema,
  listQuotationsQuerySchema,
} from "./quotations.ts";

/** Paths of the fields that failed, e.g. ['email']. */
function failedFields(body: unknown) {
  const result = quotationBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join(".") || issue.code);
}

describe("quotationBodySchema", () => {
  it("parses a body", () => {
    expect(
      quotationBodySchema.parse({ customerId: 1, typeId: "STD", validUntil: '2026-01-01' }),
    ).toEqual({
      customerId: 1,
      typeId: "STD",
      notes: null,
      validUntil: null,
      items: [],
      rejectedAt: null,
    });
  });

  it("takes the items of a sales order and rejects two with the same position", () => {
    const item = { productId: 10, quantity: 2, position: 1 };
    expect(
      quotationBodySchema.parse({ customerId: 1, typeId: "STD", items: [item], validUntil: '2026-01-01' }).items,
    ).toEqual([{ ...item, uomId: null }]);
    expect(
      failedFields({ customerId: 1, typeId: "STD", items: [item, item], validUntil: '2026-01-01' }),
    ).toEqual(["items"]);
  });

  it("rejects unknown properties such as deletedAt", () => {
    expect(
      failedFields({
        deletedAt: "2026-01-01",
        customerId: 1,
        typeId: "STD",
        validUntil: '2026-01-01',
      }),
    ).toEqual(["unrecognized_keys"]);
  });
});

describe("listQuotationsQuerySchema", () => {
  it("turns limit and offset into numbers", () => {
    expect(
      listQuotationsQuerySchema.parse({ limit: "10", offset: "20" }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it("rejects an unknown sort field and a limit over 100", () => {
    const result = listQuotationsQuerySchema.safeParse({
      sortBy: "password",
      limit: "500",
    });
    expect(result.success).toBe(false);
  });
});
