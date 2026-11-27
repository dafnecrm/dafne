/** Better Auth error codes with their own message (`auth.errors.<key>`). */
const AUTH_ERROR_CODES = {
  USER_ALREADY_EXISTS: "userExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "userExists",
  INVALID_AVATAR: "invalidAvatar",
  // changePassword: the current password is wrong.
  INVALID_PASSWORD: "wrongPassword",
} as const;

/**
 * The form field a Better Auth error code is about. Invalid credentials
 * name none: telling which of email and password is wrong would leak
 * whether the account exists.
 */
const AUTH_ERROR_FIELDS: Record<string, string> = {
  USER_ALREADY_EXISTS: "email",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "email",
  INVALID_PASSWORD: "currentPassword",
};

/** The form field `error` is about, or undefined when it names none. */
export function authErrorField(error: AuthError): string | undefined {
  return error.code ? AUTH_ERROR_FIELDS[error.code] : undefined;
}

export interface AuthError {
  status: number;
  code?: string;
  message?: string;
}

export type AuthErrorKey =
  | `auth.errors.${(typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]}`
  | "auth.errors.invalidCredentials"
  | "auth.errors.tooManyAttempts";

/**
 * The message key for a Better Auth error, or null when it has none (then
 * show the error's own text). Better Auth answers in English, so known
 * codes and statuses are mapped to the app's messages.
 */
export function authErrorKey(error: AuthError): AuthErrorKey | null {
  const key = AUTH_ERROR_CODES[error.code as keyof typeof AUTH_ERROR_CODES];
  if (key) {
    return `auth.errors.${key}`;
  }
  if (error.status === 401) {
    return "auth.errors.invalidCredentials";
  }
  if (error.status === 429) {
    return "auth.errors.tooManyAttempts";
  }
  return null;
}
