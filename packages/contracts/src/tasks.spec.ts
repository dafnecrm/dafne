import { listTaskRunsQuerySchema, updateTaskBodySchema } from "./tasks.ts";

/** Paths of the fields that failed, e.g. ['cron']. */
function failedFields(body: unknown) {
  const result = updateTaskBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join(".") || issue.code);
}

describe("updateTaskBodySchema", () => {
  it("parses a body, blanks becoming null", () => {
    expect(
      updateTaskBodySchema.parse({ cron: " ", timezone: "Europe/Rome", enabled: true, timeoutSeconds: "" }),
    ).toEqual({ cron: null, timezone: "Europe/Rome", enabled: true, timeoutSeconds: null });
  });

  it("keeps a cron pattern and a timeout given as text", () => {
    expect(
      updateTaskBodySchema.parse({ cron: "*/5 * * * *", timezone: "UTC", enabled: false, timeoutSeconds: "60" }),
    ).toEqual({ cron: "*/5 * * * *", timezone: "UTC", enabled: false, timeoutSeconds: 60 });
  });

  it("rejects a missing time zone and a timeout out of range", () => {
    expect(failedFields({ timezone: "", enabled: true, timeoutSeconds: 0 })).toEqual([
      "timezone",
      "timeoutSeconds",
    ]);
  });

  it("rejects unknown properties", () => {
    expect(failedFields({ timezone: "UTC", enabled: true, key: "x" })).toEqual(["unrecognized_keys"]);
  });
});

describe("listTaskRunsQuerySchema", () => {
  it("turns limit and offset into numbers and checks the status", () => {
    expect(listTaskRunsQuerySchema.parse({ limit: "10", offset: "20", status: "failed" })).toEqual({
      limit: 10,
      offset: 20,
      status: "failed",
    });
    expect(listTaskRunsQuerySchema.safeParse({ status: "lost" }).success).toBe(false);
  });
});
