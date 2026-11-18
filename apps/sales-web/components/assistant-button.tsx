"use client";

import { AssistantPanel } from "@dafne/frontend-assistant/chat/components/assistant-panel";

/** The AI assistant's panel, relaying messages through this app's route handler. */
export function AssistantButton() {
  return <AssistantPanel streamPath={(id) => `/api/assistant/${id}/messages`} />;
}
