import { backendFetch } from "@dafne/frontend-api/server";
import type {
  AssistantConversation,
  AssistantConversationDetail,
  AvailableAssistantAgent,
} from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * The assistant's reads, for the server (backendFetch forwards the
 * browser's cookies). Streaming a message goes through the app's route
 * handler (streamResponse), not these.
 */

export async function listAvailableAgents(): Promise<Json<AvailableAssistantAgent[]>> {
  return (await backendFetch("/assistant/agents")).json();
}

export async function listConversations(): Promise<Json<AssistantConversation[]>> {
  return (await backendFetch("/assistant/conversations")).json();
}

export async function getConversation(id: number): Promise<Json<AssistantConversationDetail>> {
  return (await backendFetch(`/assistant/conversations/${encodeURIComponent(id)}`)).json();
}

/**
 * Sends a message to the backend and hands its event stream back as is,
 * for the app's route handler (the browser can't call the API directly:
 * the cookie and the language are added here).
 */
export async function streamMessage(conversationId: number, text: string): Promise<Response> {
  const res = await backendFetch(
    `/assistant/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify({ text }) },
  );
  return new Response(res.body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
