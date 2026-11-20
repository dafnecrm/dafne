import { BackendError, backendFetch } from "@dafne/frontend-api/server";

/** The headers of a file the backend sends that the browser needs. */
const FILE_HEADERS = ["content-type", "content-disposition", "content-length"];

/**
 * Relays a file of the API (a PDF, a .docx) to the browser, which can't
 * call the API itself: backendFetch adds the session cookie and the
 * language. An error comes back as its translated message, as text.
 */
export async function relayFile(path: string): Promise<Response> {
  try {
    const res = await backendFetch(path);
    const headers = new Headers();
    for (const name of FILE_HEADERS) {
      const value = res.headers.get(name);
      if (value) {
        headers.set(name, value);
      }
    }
    headers.set("cache-control", "private, no-store");
    return new Response(res.body, { status: res.status, headers });
  } catch (error) {
    if (error instanceof BackendError) {
      return new Response(error.message, {
        status: error.status,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    throw error;
  }
}
