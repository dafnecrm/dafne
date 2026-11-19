import {
  uomConversionBodySchema,
  listUomConversionsQuerySchema,
} from "./uom-conversions.ts";

/** Paths of the fields that failed, e.g. ['email']. */
function failedFields(body: unknown) {
  const result = uomConversionBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join(".") || issue.code);
}

describe("uomConversionBodySchema", () => {
  it("parses a body, the factor as a number", () => {
    expect(
      uomConversionBodySchema.parse({ fromUomId: " g ", toUomId: "kg", factor: "1000" }),
    ).toEqual({ fromUomId: "g", toUomId: "kg", factor: 1000 });
  });

  it("rejects a factor that is not positive and a unit converting to itself", () => {
    expect(failedFields({ fromUomId: "g", toUomId: "kg", factor: 0 })).toEqual(["factor"]);
    expect(failedFields({ fromUomId: "g", toUomId: "g", factor: 1 })).toEqual(["toUomId"]);
  });

  it("rejects unknown properties such as deletedAt", () => {
    expect(
      failedFields({
        deletedAt: "2026-01-01",
        fromUomId: "g",
        toUomId: "kg",
        factor: 1000,
      }),
    ).toEqual(["unrecognized_keys"]);
  });
});

describe("listUomConversionsQuerySchema", () => {
  it("turns limit and offset into numbers", () => {
    expect(
      listUomConversionsQuerySchema.parse({ limit: "10", offset: "20" }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it("rejects an unknown sort field and a limit over 100", () => {
    const result = listUomConversionsQuerySchema.safeParse({
      sortBy: "password",
      limit: "500",
    });
    expect(result.success).toBe(false);
  });
});
