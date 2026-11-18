import {
  assistantModelBodySchema,
  listAssistantModelsQuerySchema,
} from "./assistant-models.ts";

/** Paths of the fields that failed, e.g. ['email']. */
function failedFields(body: unknown) {
  const result = assistantModelBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join(".") || issue.code);
}

describe("assistantModelBodySchema", () => {
  it("parses a body", () => {
    expect(
      assistantModelBodySchema.parse({
        providerId: 1,
        modelId: "Model id",
        label: "Label",
      }),
    ).toEqual({ providerId: 1, modelId: "Model id", label: "Label", options: null });
  });

  it("checks the options", () => {
    expect(
      failedFields({ providerId: 1, modelId: "m", label: "l", options: { reasoning: "none", temperature: 0.2 } }),
    ).toEqual([]);
    expect(
      failedFields({ providerId: 1, modelId: "m", label: "l", options: { reasoning: "huge" } }),
    ).toEqual(["options.reasoning"]);
  });

  it("rejects unknown properties such as deletedAt", () => {
    expect(
      failedFields({
        deletedAt: "2026-01-01",
        providerId: 1,
        modelId: "Model id",
        label: "Label",
      }),
    ).toEqual(["unrecognized_keys"]);
  });
});

describe("listAssistantModelsQuerySchema", () => {
  it("turns limit and offset into numbers", () => {
    expect(
      listAssistantModelsQuerySchema.parse({ limit: "10", offset: "20" }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it("rejects an unknown sort field and a limit over 100", () => {
    const result = listAssistantModelsQuerySchema.safeParse({
      sortBy: "password",
      limit: "500",
    });
    expect(result.success).toBe(false);
  });
});
