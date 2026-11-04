import { authErrorKey } from "./errors.ts";

describe("authErrorKey", () => {
  it("maps known codes before the status", () => {
    expect(authErrorKey({ status: 422, code: "USER_ALREADY_EXISTS" })).toBe(
      "auth.errors.userExists",
    );
    expect(authErrorKey({ status: 401, code: "INVALID_AVATAR" })).toBe(
      "auth.errors.invalidAvatar",
    );
  });

  it("maps 401 and 429", () => {
    expect(authErrorKey({ status: 401 })).toBe("auth.errors.invalidCredentials");
    expect(authErrorKey({ status: 429 })).toBe("auth.errors.tooManyAttempts");
  });

  it("returns null for anything else", () => {
    expect(authErrorKey({ status: 500, code: "OTHER", message: "x" })).toBeNull();
  });
});
