import {
  assistantAgentBodySchema,
  listAssistantAgentsQuerySchema,
} from "./assistant-agents.ts";

/** Paths of the fields that failed, e.g. ['email']. */
function failedFields(body: unknown) {
  const result = assistantAgentBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join(".") || issue.code);
}

describe("assistantAgentBodySchema", () => {
  it("parses a body", () => {
    expect(
      assistantAgentBodySchema.parse({
        name: "Name",
        systemPrompt: "System prompt",
      }),
    ).toEqual({
      name: "Name",
      systemPrompt: "System prompt",
      description: null,
      tools: [],
      defaultModelId: null,
      groupIds: [],
    });
  });

  it("needs a group when only groups can use it", () => {
    expect(failedFields({ name: "Name", systemPrompt: "S", audience: "groups" })).toEqual(["groupIds"]);
    expect(failedFields({ name: "Name", systemPrompt: "S", audience: "groups", groupIds: [1, 1] })).toEqual([]);
    expect(failedFields({ name: "Name", systemPrompt: "S", audience: "everyone" })).toEqual([]);
  });

  it("accepts known tools only, without repeats", () => {
    expect(
      assistantAgentBodySchema.parse({
        name: "Name",
        systemPrompt: "System prompt",
        tools: ["search_customers", "search_customers", "get_customer"],
      }).tools,
    ).toEqual(["search_customers", "get_customer"]);
    expect(
      failedFields({ name: "Name", systemPrompt: "System prompt", tools: ["drop_database"] }),
    ).toEqual(["tools.0"]);
  });

  it("rejects unknown properties such as deletedAt", () => {
    expect(
      failedFields({
        deletedAt: "2026-01-01",
        name: "Name",
        systemPrompt: "System prompt",
      }),
    ).toEqual(["unrecognized_keys"]);
  });
});

describe("listAssistantAgentsQuerySchema", () => {
  it("turns limit and offset into numbers", () => {
    expect(
      listAssistantAgentsQuerySchema.parse({ limit: "10", offset: "20" }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it("rejects an unknown sort field and a limit over 100", () => {
    const result = listAssistantAgentsQuerySchema.safeParse({
      sortBy: "password",
      limit: "500",
    });
    expect(result.success).toBe(false);
  });
});
