import { readEvents } from "./stream.ts";

/** A body that arrives in the given chunks. */
const body = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

describe("readEvents", () => {
  it("parses events split across chunks, in order", async () => {
    const events: unknown[] = [];
    await readEvents(
      body(['data: {"type":"text","delta":"Ci', 'ao"}\n\ndata: {"type":"tool","name":"search_customers"}\n', '\ndata: {"type":"done","messageId":3}\n\n']),
      (event) => events.push(event),
    );
    expect(events).toEqual([
      { type: "text", delta: "Ciao" },
      { type: "tool", name: "search_customers" },
      { type: "done", messageId: 3 },
    ]);
  });
});
