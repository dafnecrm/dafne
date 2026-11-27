import { authErrorField, authErrorKey } from "./errors.ts";

describe("authErrorKey", () => {
  it("maps known codes before the status", () => {
    expect(authErrorKey({ status: 422, code: "USER_ALREADY_EXISTS" })).toBe(
      "auth.errors.userExists",
    );
    expect(authErrorKey({ status: 401, code: "INVALID_AVATAR" })).toBe(
      "auth.errors.invalidAvatar",
    );
    expect(authErrorKey({ status: 400, code: "INVALID_PASSWORD" })).toBe(
      "auth.errors.wrongPassword",
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

describe("authErrorField", () => {
  it("names the field of known codes", () => {
    expect(authErrorField({ status: 422, code: "USER_ALREADY_EXISTS" })).toBe("email");
    expect(authErrorField({ status: 400, code: "INVALID_PASSWORD" })).toBe("currentPassword");
  });

  it("names none for wrong credentials or unknown codes", () => {
    expect(authErrorField({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" })).toBeUndefined();
    expect(authErrorField({ status: 500 })).toBeUndefined();
  });
});
