import { defineAssistantAgentsTable } from "@dafne/frontend-assistant/assistant-agents";

/** This app's assistant agents table (@dafne/frontend-assistant/assistant-agents), on /admin/assistant-agents. */
export const assistantAgentsTable = defineAssistantAgentsTable({
  path: "/admin/assistant-agents",
});
