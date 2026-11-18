import { connection } from "next/server";
import { listAssistantModels } from "@dafne/frontend-assistant/assistant-models/server";
import { listAssistantProviders } from "@dafne/frontend-assistant/assistant-providers/server";
import { listUserGroups } from "@dafne/frontend-user-groups/server";

/*
 * Choices of the AI assistant's settings forms: the providers a model can
 * belong to, the models an agent can default to. Their lists are short.
 * Read per request (connection()): the "new" pages have no params that
 * would make them dynamic, and the backend's data can't be prerendered.
 */

export async function providerOptions() {
  await connection();
  const { items } = await listAssistantProviders({ limit: 100, offset: 0, sort: { id: "name", desc: false } });
  return items.map(({ id, name }) => ({ id, name }));
}

export async function modelOptions() {
  await connection();
  const { items } = await listAssistantModels({ limit: 100, offset: 0, sort: { id: "label", desc: false } });
  return items.map(({ id, label }) => ({ id, label }));
}

export async function groupOptions() {
  await connection();
  const { items } = await listUserGroups({ limit: 100, offset: 0, sort: { id: "name", desc: false } });
  return items.map(({ id, name }) => ({ id, name }));
}
