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
    });
  });

  it("refuses permissions: they're each app's own", () => {
    expect(failedFields({ name: "Name", permissions: ["Customer.create"] })).toEqual(["unrecognized_keys"]);
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

  it("filters by member", () => {
    expect(listUserGroupsQuerySchema.parse({ memberId: "u1" })).toEqual({ memberId: "u1" });
  });

  it("rejects an unknown sort field and a limit over 100", () => {
    const result = listUserGroupsQuerySchema.safeParse({
      sortBy: "password",
      limit: "500",
    });
    expect(result.success).toBe(false);
  });
});
