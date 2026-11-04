import { BackendError, errorMessage } from "./errors.ts";

describe("errorMessage", () => {
  it("joins Nest validation messages", () => {
    expect(errorMessage({ message: ["a", "b"] }, "x")).toBe("a, b");
  });

  it("uses the message, else the fallback", () => {
    expect(errorMessage({ message: "nope" }, "x")).toBe("nope");
    expect(errorMessage({}, "Not Found")).toBe("Not Found");
  });
});

describe("BackendError", () => {
  it("keeps the status", () => {
    const error = new BackendError(404, "missing");
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(404);
    expect(error.message).toBe("missing");
  });
});
