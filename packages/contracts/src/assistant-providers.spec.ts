import {
  assistantProviderBodySchema,
  listAssistantProvidersQuerySchema,
} from "./assistant-providers.ts";

/** Paths of the fields that failed, e.g. ['email']. */
function failedFields(body: unknown) {
  const result = assistantProviderBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join(".") || issue.code);
}

describe("assistantProviderBodySchema", () => {
  it("parses a body", () => {
    expect(
      assistantProviderBodySchema.parse({ name: "Name", kind: "anthropic" }),
    ).toEqual({
      name: "Name",
      kind: "anthropic",
      baseUrl: null,
      apiKeyEnv: null,
    });
  });

  it("needs a base URL for OpenAI-compatible servers", () => {
    expect(failedFields({ name: "Ollama", kind: "openai-compatible" })).toEqual(["baseUrl"]);
    expect(
      failedFields({ name: "Ollama", kind: "openai-compatible", baseUrl: "http://localhost:11434/v1" }),
    ).toEqual([]);
    expect(failedFields({ name: "X", kind: "openai", baseUrl: "ftp://x" })).toEqual(["baseUrl"]);
  });

  it("takes the name of an env var, not a key", () => {
    expect(failedFields({ name: "A", kind: "anthropic", apiKeyEnv: "ANTHROPIC_API_KEY" })).toEqual([]);
    expect(failedFields({ name: "A", kind: "anthropic", apiKeyEnv: "sk-ant-123" })).toEqual(["apiKeyEnv"]);
  });

  it("rejects unknown properties such as deletedAt", () => {
    expect(
      failedFields({
        deletedAt: "2026-01-01",
        name: "Name",
        kind: "anthropic",
      }),
    ).toEqual(["unrecognized_keys"]);
  });
});

describe("listAssistantProvidersQuerySchema", () => {
  it("turns limit and offset into numbers", () => {
    expect(
      listAssistantProvidersQuerySchema.parse({ limit: "10", offset: "20" }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it("rejects an unknown sort field and a limit over 100", () => {
    const result = listAssistantProvidersQuerySchema.safeParse({
      sortBy: "password",
      limit: "500",
    });
    expect(result.success).toBe(false);
  });
});
