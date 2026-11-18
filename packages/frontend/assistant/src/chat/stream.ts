import type { AssistantStreamEvent, Json } from "@dafne/contracts";

/** An event as the browser reads it (dates as strings). */
export type ClientStreamEvent = Json<AssistantStreamEvent>;

/**
 * Reads a server-sent events body (`data: <json>` blocks) and calls
 * `onEvent` for each, in order. Resolves when the stream ends.
 */
export async function readEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ClientStreamEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let end = buffer.indexOf("\n\n");
    while (end >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      for (const line of block.split("\n")) {
        if (line.startsWith("data: ")) {
          onEvent(JSON.parse(line.slice(6)) as ClientStreamEvent);
        }
      }
      end = buffer.indexOf("\n\n");
    }
  }
}
