/** Error body returned by the backend (Nest validation or Better Auth). */
export interface BackendErrorBody {
  message?: string | string[];
  code?: string;
}

export class BackendError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** The message of an error body: Nest validation sends a list. */
export function errorMessage(body: BackendErrorBody, fallback: string) {
  return Array.isArray(body.message)
    ? body.message.join(", ")
    : (body.message ?? fallback);
}
