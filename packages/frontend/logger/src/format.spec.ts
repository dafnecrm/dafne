import { formatLine, now } from "./format.ts";

const line = {
  level: "info" as const,
  scope: "customers",
  message: "Saved",
  attributes: { customerId: "42" },
  time: Date.UTC(2026, 10, 25, 10, 0, 0),
};

describe("formatLine", () => {
  it("writes JSON with the trace in production", () => {
    const json = JSON.parse(formatLine({ ...line, traceId: "abc" }, true));
    expect(json).toMatchObject({ level: "info", scope: "customers", msg: "Saved", customerId: "42", trace_id: "abc" });
    expect(json.time).toBe("2026-11-25T10:00:00.000Z");
  });

  it("writes a readable line in development", () => {
    expect(formatLine(line, false)).toBe('INFO [customers] Saved {"customerId":"42"}');
    expect(formatLine({ ...line, attributes: {} }, false)).toBe("INFO [customers] Saved");
  });
});

describe("now", () => {
  it("is the wall-clock time, from the timing API", () => {
    expect(Math.abs(now() - Date.now())).toBeLessThan(1000);
  });
});
