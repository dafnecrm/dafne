import {
  userGroupBodySchema,
  listUserGroupsQuerySchema,
} from "./user-groups.ts";

/** Paths of the fields that failed, e.g. ['email']. */
function failedFields(body: unknown) {
  const result = userGroupBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join(".") || issue.code);
}

describe("userGroupBodySchema", () => {
  it("parses a body", () => {
    expect(userGroupBodySchema.parse({ name: "Name" })).toEqual({
      name: "Name",
      description: null,
      memberIds: [],
      permissions: [],
    });
  });

  it("refuses an unknown permission", () => {
    expect(failedFields({ name: "Name", permissions: ["Customer.fly"] })).toEqual(["permissions.0"]);
  });

  it("keeps each member once", () => {
    expect(userGroupBodySchema.parse({ name: "Name", memberIds: ["u1", "u2", "u1"] }).memberIds).toEqual([
      "u1",
      "u2",
    ]);
  });

  it("rejects unknown properties such as deletedAt", () => {
    expect(failedFields({ deletedAt: "2026-01-01", name: "Name" })).toEqual([
      "unrecognized_keys",
    ]);
  });
});

describe("listUserGroupsQuerySchema", () => {
  it("turns limit and offset into numbers", () => {
    expect(
      listUserGroupsQuerySchema.parse({ limit: "10", offset: "20" }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it("rejects an unknown sort field and a limit over 100", () => {
    const result = listUserGroupsQuerySchema.safeParse({
      sortBy: "password",
      limit: "500",
    });
    expect(result.success).toBe(false);
  });
});
