import {
  documentTemplateBodySchema,
  listDocumentTemplatesQuerySchema,
  renderDocumentQuerySchema,
} from "./document-templates.ts";

/** Paths of the fields that failed, e.g. ['email']. */
function failedFields(body: unknown) {
  const result = documentTemplateBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join(".") || issue.code);
}

describe("documentTemplateBodySchema", () => {
  it("parses a body", () => {
    expect(
      documentTemplateBodySchema.parse({ name: "Name", resource: "Resource" }),
    ).toEqual({ name: "Name", resource: "Resource" });
  });

  it("rejects unknown properties such as deletedAt", () => {
    expect(
      failedFields({
        deletedAt: "2026-01-01",
        name: "Name",
        resource: "Resource",
      }),
    ).toEqual(["unrecognized_keys"]);
  });
});

describe("listDocumentTemplatesQuerySchema", () => {
  it("turns limit and offset into numbers", () => {
    expect(
      listDocumentTemplatesQuerySchema.parse({ limit: "10", offset: "20" }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it("rejects an unknown sort field and a limit over 100", () => {
    const result = listDocumentTemplatesQuerySchema.safeParse({
      sortBy: "password",
      limit: "500",
    });
    expect(result.success).toBe(false);
  });
});

describe("renderDocumentQuerySchema", () => {
  it("reads the template's id, or none for the default", () => {
    expect(renderDocumentQuerySchema.parse({ template: "7" })).toEqual({ template: 7 });
    expect(renderDocumentQuerySchema.parse({})).toEqual({});
    expect(renderDocumentQuerySchema.safeParse({ template: "x" }).success).toBe(false);
  });
});
