import { NextResponse } from "next/server";
import { BackendError } from "@dafne/frontend-api/server";
import { streamMessage } from "@dafne/frontend-assistant/chat/server";

/**
 * Relays a message to the AI assistant and streams its answer back
 * (server-sent events). The browser can't call the API itself: the session
 * cookie and the language are added on the way (backendFetch). Errors
 * before the answer starts come back as `{ error }` with their status.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/[locale]/api/assistant/[conversationId]/messages">,
) {
  const id = Number((await params).conversationId);
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  if (!Number.isInteger(id) || id <= 0 || typeof body?.text !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    return await streamMessage(id, body.text);
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
