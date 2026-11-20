/** Error body returned by the backend (Nest validation or Better Auth). */
export interface BackendErrorBody {
  message?: string | string[];
  code?: string;
  /** Details some errors carry, e.g. the tags at fault of a document template. */
  errors?: unknown;
}

export class BackendError extends Error {
  readonly status: number;
  /** The error's body as the backend sent it ({} when it wasn't JSON). */
  readonly body: BackendErrorBody;

  constructor(status: number, message: string, body: BackendErrorBody = {}) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/** The message of an error body: Nest validation sends a list. */
export function errorMessage(body: BackendErrorBody, fallback: string) {
  return Array.isArray(body.message)
    ? body.message.join(", ")
    : (body.message ?? fallback);
}
