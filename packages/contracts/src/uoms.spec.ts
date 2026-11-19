import { uomBodySchema, listUomsQuerySchema } from "./uoms.ts";

/** Paths of the fields that failed, e.g. ['email']. */
function failedFields(body: unknown) {
  const result = uomBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join(".") || issue.code);
}

describe("uomBodySchema", () => {
  it("parses a body", () => {
    expect(
      uomBodySchema.parse({ id: "Id", name: "Name", kind: "weight" }),
    ).toEqual({
      id: "Id",
      name: "Name",
      kind: "weight",
      description: null,
    });
  });

  it("rejects unknown properties such as deletedAt", () => {
    expect(
      failedFields({
        deletedAt: "2026-01-01",
        id: "Id",
        name: "Name",
        kind: "weight",
      }),
    ).toEqual(["unrecognized_keys"]);
  });
});

describe("listUomsQuerySchema", () => {
  it("turns limit and offset into numbers", () => {
    expect(listUomsQuerySchema.parse({ limit: "10", offset: "20" })).toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it("rejects an unknown sort field and a limit over 100", () => {
    const result = listUomsQuerySchema.safeParse({
      sortBy: "password",
      limit: "500",
    });
    expect(result.success).toBe(false);
  });
});
