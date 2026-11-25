import { REDACTED, redact, stripQuery } from "./redact.ts";

describe("redact", () => {
  it("turns values into strings and drops undefined", () => {
    expect(redact({ customerId: 42, ok: true, tags: ["a"], none: undefined })).toEqual({
      customerId: "42",
      ok: "true",
      tags: '["a"]',
    });
  });

  it("masks credentials and personal data", () => {
    expect(redact({ password: "x", accessToken: "y", email: "a@b.c", phone: "1", vatNumber: "IT1" })).toEqual({
      password: REDACTED,
      accessToken: REDACTED,
      email: REDACTED,
      phone: REDACTED,
      vatNumber: REDACTED,
    });
  });

  it("gives an error's message and stack", () => {
    const error = new Error("boom");
    const out = redact({ error });
    expect(out.error).toBe("boom");
    expect(out.stack).toContain("boom");
  });

  it("is empty without attributes", () => {
    expect(redact(undefined)).toEqual({});
  });
});

describe("stripQuery", () => {
  it("drops the query string and hash", () => {
    expect(stripQuery("https://sales-web.dafne.localhost/it/customers?q=rossi#top")).toBe(
      "https://sales-web.dafne.localhost/it/customers",
    );
    expect(stripQuery("/it/customers")).toBe("/it/customers");
  });
});
