import { describe, expect, it } from "vitest";
import {
  createHarness,
  INTERRUPTED_TOOL_RESULT,
  type HarnessEvent,
  type InferenceClient,
  type InferenceEvent,
  type InferenceRequest,
  type Message,
  type RunOptions,
  type Tool,
  type ToolResult,
} from "../src/index.js";

const USER: Message[] = [{ content: "hi", role: "user" }];

function callEvent(...names: string[]): InferenceEvent {
  return {
    toolCalls: names.map((name, index) => ({
      function: { arguments: "{}", name },
      id: `call_${index}`,
    })),
    type: "tool_calls",
  };
}

// a client that plays one scripted turn per request and records what it was sent
function scriptedClient(turns: Array<InferenceEvent[] | Error>) {
  const requests: InferenceRequest[] = [];
  const client: InferenceClient = {
    async *stream(request) {
      requests.push({ ...request, messages: [...request.messages] });

      const turn = turns[requests.length - 1] ?? [];

      if (turn instanceof Error) throw turn;

      yield* turn;
    },
  };

  return { client, requests };
}

function tool(
  name: string,
  execute: Tool["execute"] = async () => ({ content: `${name} ran` }),
): Tool {
  return { definition: { function: { name }, type: "function" }, execute };
}

async function collect(
  client: InferenceClient,
  tools: Tool[] = [],
  options?: RunOptions,
  signal?: AbortSignal,
): Promise<HarnessEvent[]> {
  const events: HarnessEvent[] = [];

  for await (const event of createHarness(client).run(USER, tools, signal, options))
    events.push(event);

  return events;
}

function types(events: HarnessEvent[]): string[] {
  return events.map((event) => event.type);
}

function last(events: HarnessEvent[]): HarnessEvent {
  return events[events.length - 1];
}

function results(events: HarnessEvent[]) {
  return events.filter((event) => event.type === "tool_result");
}

describe("createHarness", () => {
  it("ends after a turn without tool calls", async () => {
    const { client, requests } = scriptedClient([
      [
        { delta: "think", type: "reasoning" },
        { delta: "Hel", type: "text" },
        { delta: "lo", type: "text" },
      ],
    ]);
    const events = await collect(client);

    expect(types(events)).toEqual(["turn_start", "request", "reasoning", "text", "text", "message", "done"]);
    expect(events[5]).toMatchObject({ content: "Hello", final: true, reasoning: "think" });
    expect(last(events)).toMatchObject({ reason: "complete" });
    expect(requests[0].tools).toBeUndefined();
  });

  it("runs the called tool and sends its result with the next request", async () => {
    const { client, requests } = scriptedClient([
      [{ delta: "let me look", type: "text" }, callEvent("read")],
      [{ delta: "done", type: "text" }],
    ]);
    const events = await collect(client, [tool("read")]);

    expect(types(events)).toEqual([
      "turn_start",
      "request",
      "text",
      "tool_call_delta",
      "message",
      "tool_call",
      "tool_result",
      "turn_end",
      "turn_start",
      "request",
      "text",
      "message",
      "turn_end",
      "done",
    ]);
    expect(events[4]).toMatchObject({
      final: false,
      toolCalls: [{ id: "call_0", type: "function" }],
    });
    expect(requests[1].messages.slice(1)).toEqual([
      {
        content: "let me look",
        reasoning_content: undefined,
        role: "assistant",
        tool_calls: [
          { function: { arguments: "{}", name: "read" }, id: "call_0", type: "function" },
        ],
      },
      { content: "read ran", role: "tool", tool_call_id: "call_0" },
    ]);
    expect(requests[0].tools).toEqual([{ function: { name: "read" }, type: "function" }]);
  });

  it("sends a result's media parts after its text", async () => {
    const image = { image_url: { url: "data:image/png;base64,AAAA" }, type: "image_url" } as const;
    const { client, requests } = scriptedClient([[callEvent("shot")], []]);

    await collect(client, [tool("shot", async () => ({ content: "saved", parts: [image] }))]);

    expect(requests[1].messages[2]).toEqual({
      content: [{ text: "saved", type: "text" }, image],
      role: "tool",
      tool_call_id: "call_0",
    });
  });

  it("reports an unknown tool and a tool that throws to the model", async () => {
    const { client } = scriptedClient([[callEvent("missing", "broken")], []]);
    const events = await collect(client, [
      tool("broken", async () => {
        throw new Error("boom");
      }),
    ]);

    expect(results(events).map((event) => event.result)).toEqual([
      { content: "Error: Unknown tool: missing", isError: true },
      { content: "Error: boom", isError: true },
    ]);
    expect(last(events)).toMatchObject({
      timings: {
        agentic: { toolCalls: [{ success: false }, { success: false }], toolCallsCount: 2 },
      },
    });
  });

  it("emits a streaming tool's updates before its result", async () => {
    const { client } = scriptedClient([[callEvent("shell")], []]);
    const events = await collect(client, [
      tool("shell", async (_call, { update }) => {
        update("");
        await Promise.resolve();
        update("a");
        update("ab");

        return { content: "ab" };
      }),
    ]);
    const updates = events.filter((event) => event.type === "tool_update");

    // "a" was replaced before the consumer asked for it
    expect(updates.map((event) => event.content)).toEqual(["", "ab"]);
    expect(types(events).indexOf("tool_result")).toBeGreaterThan(
      types(events).lastIndexOf("tool_update"),
    );
  });

  it("uses the duration a tool reports", async () => {
    const { client } = scriptedClient([[callEvent("slow")], []]);
    const events = await collect(client, [
      tool("slow", async () => ({ content: "", durationMs: 1234 })),
    ]);

    expect(last(events)).toMatchObject({ timings: { agentic: { toolsMs: 1234 } } });
  });

  it("ends without a result when a tool rejects with an AbortError", async () => {
    const { client, requests } = scriptedClient([[callEvent("gated")], []]);
    const events = await collect(client, [
      tool("gated", async () => {
        throw new DOMException("Operation was aborted", "AbortError");
      }),
    ]);

    expect(results(events)).toEqual([]);
    expect(last(events)).toMatchObject({ reason: "aborted" });
    expect(requests).toHaveLength(1);
  });

  it("keeps the partial output when the signal aborts mid-stream", async () => {
    const controller = new AbortController();
    const client: InferenceClient = {
      async *stream() {
        yield { delta: "par", type: "text" };
        controller.abort();
        throw new DOMException("Operation was aborted", "AbortError");
      },
    };
    const events = await collect(client, [], undefined, controller.signal);

    expect(types(events)).toEqual(["turn_start", "request", "text", "message", "done"]);
    expect(events[3]).toMatchObject({ content: "par", final: true });
    expect(last(events)).toMatchObject({ reason: "aborted" });
  });

  it("ends with an error event when the stream fails", async () => {
    const { client } = scriptedClient([new Error("HTTP 500")]);
    const events = await collect(client);

    expect(types(events)).toEqual(["turn_start", "request", "message", "error"]);
    expect(last(events)).toMatchObject({ error: { message: "HTTP 500" } });
  });

  it("keeps the tool calls of the turn it is interrupted after, and runs none", async () => {
    const { client, requests } = scriptedClient([[callEvent("read")], []]);
    const events = await collect(client, [tool("read")], { interrupted: () => true });

    expect(types(events)).toEqual(["turn_start", "request", "tool_call_delta", "message", "done"]);
    expect(events[3]).toMatchObject({ final: true, toolCalls: [{ id: "call_0" }] });
    expect(last(events)).toMatchObject({ reason: "interrupted" });
    expect(requests).toHaveLength(1);
  });

  it("skips the tool calls left when it is interrupted between two", async () => {
    let interrupted = false;

    const { client, requests } = scriptedClient([[callEvent("first", "second", "third")], []]);
    const events = await collect(
      client,
      [
        tool("first", async (): Promise<ToolResult> => {
          interrupted = true;

          return { content: "first ran" };
        }),
        tool("second"),
        tool("third"),
      ],
      { interrupted: () => interrupted },
    );

    expect(results(events).map((event) => [event.result.content, event.skipped])).toEqual([
      ["first ran", false],
      [INTERRUPTED_TOOL_RESULT, true],
      [INTERRUPTED_TOOL_RESULT, true],
    ]);
    expect(last(events)).toMatchObject({ reason: "interrupted" });
    expect(requests).toHaveLength(1);
  });

  it("asks at the turn limit and starts the turn count again when it goes on", async () => {
    const answers = [true, false];
    const { client } = scriptedClient([[callEvent("read")], [callEvent("read")], []]);
    const events = await collect(client, [tool("read")], {
      maxTurns: 1,
      onTurnLimit: async () => answers.shift() ?? false,
    });
    const turns = events.filter((event) => event.type === "turn_start");

    expect(turns.map((event) => event.turn)).toEqual([1, 1]);
    expect(last(events)).toMatchObject({ reason: "turn_limit" });
  });

  it("adds up the timings of every turn", async () => {
    const timings = (n: number): InferenceEvent => ({
      timings: { cache_n: 1, predicted_ms: n, predicted_n: n, prompt_ms: n, prompt_n: n },
      type: "timings",
    });
    const { client } = scriptedClient([[timings(10), callEvent("read")], [timings(5)]]);
    const events = await collect(client, [tool("read")]);
    const live = events
      .filter((event) => event.type === "timings")
      .map((event) => event.llm?.predicted_n);

    expect(live).toEqual([10, 15]);
    expect(last(events)).toMatchObject({
      timings: {
        agentic: {
          llm: { predicted_ms: 15, predicted_n: 15, prompt_ms: 15, prompt_n: 15 },
          perTurn: [{ turn: 1 }, { turn: 2 }],
          toolCallsCount: 1,
          turns: 2,
        },
        cache_n: 1,
        predicted_n: 5,
      },
    });
  });

  it("reports the last request's timings alone when no tool ran", async () => {
    const { client } = scriptedClient([[{ timings: { predicted_n: 3 }, type: "timings" }]]);
    const events = await collect(client);

    expect(types(events)).toEqual(["turn_start", "request", "timings", "message", "turn_end", "done"]);
    expect(last(events)).toEqual({ reason: "complete", timings: { predicted_n: 3 }, type: "done" });
  });

  it("reports what each turn sends", async () => {
    const { client } = scriptedClient([[callEvent("read")], [{ delta: "ok", type: "text" }]]);
    const events = await collect(client, [tool("read")]);
    const sent = events.filter((event) => event.type === "request");

    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({
      messages: USER,
      tools: [{ function: { name: "read" }, type: "function" }],
      turn: 1,
    });
    expect(sent[1]).toMatchObject({ turn: 2 });
    if (sent[1].type === "request") expect(sent[1].messages.map((m) => m.role)).toEqual(["user", "assistant", "tool"]);
  });

  it("runs a call that authorize allows and times it without the wait", async () => {
    const { client } = scriptedClient([[callEvent("read")], []]);
    const seen: string[] = [];
    const events = await collect(client, [tool("read")], {
      authorize: async (call) => {
        seen.push(call.function.name);
        await new Promise((resolve) => setTimeout(resolve, 30));

        return { type: "allow" };
      },
    });

    expect(seen).toEqual(["read"]);
    expect(results(events)[0]).toMatchObject({ result: { content: "read ran" } });
    expect(last(events)).toMatchObject({ reason: "complete" });
    const end = events.find((event) => event.type === "turn_end");
    if (end?.type === "turn_end") expect(end.timings.agentic?.toolCalls[0].duration_ms).toBeLessThan(30);
  });

  it("gives the model the reason when authorize denies a call, without running it", async () => {
    let ran = false;
    const { client, requests } = scriptedClient([[callEvent("write")], []]);
    const events = await collect(
      client,
      [tool("write", async () => ((ran = true), { content: "written" }))],
      { authorize: async () => ({ reason: "Tool execution was denied by the user.", type: "deny" }) },
    );

    expect(ran).toBe(false);
    expect(results(events)[0]).toMatchObject({
      result: { content: "Tool execution was denied by the user.", isError: true },
      skipped: false,
    });
    expect(requests[1].messages[2]).toEqual({
      content: "Tool execution was denied by the user.",
      role: "tool",
      tool_call_id: "call_0",
    });
  });

  it("does not ask authorize about a tool it was not given", async () => {
    let asked = false;
    const { client } = scriptedClient([[callEvent("ghost")], []]);
    const events = await collect(client, [], {
      authorize: async () => ((asked = true), { type: "allow" }),
    });

    expect(asked).toBe(false);
    expect(results(events)[0]).toMatchObject({ result: { content: "Error: Unknown tool: ghost" } });
  });

  it("ends the run when authorize rejects with an AbortError", async () => {
    const controller = new AbortController();
    const { client } = scriptedClient([[callEvent("read")]]);
    const events = await collect(
      client,
      [tool("read")],
      {
        authorize: async () => {
          controller.abort();

          throw new DOMException("stopped", "AbortError");
        },
      },
      controller.signal,
    );

    expect(results(events)).toHaveLength(0);
    expect(last(events)).toMatchObject({ reason: "aborted", type: "done" });
  });

  it("lets prepareTurn add tools for the next turn and keeps them", async () => {
    const { client, requests } = scriptedClient([[callEvent("search")], [callEvent("loaded")], []]);
    const loaded = tool("loaded");
    const events = await collect(client, [tool("search")], {
      prepareTurn: async ({ tools, turn }) => (turn === 2 ? { tools: [...tools, loaded] } : undefined),
    });

    expect(requests.map((r) => r.tools?.map((t) => t.function.name))).toEqual([
      ["search"],
      ["search", "loaded"],
      ["search", "loaded"],
    ]);
    expect(results(events).map((e) => e.type === "tool_result" && e.result.content)).toEqual([
      "search ran",
      "loaded ran",
    ]);
  });

  it("lets prepareTurn replace the history it sends, e.g. with a compacted one", async () => {
    const { client, requests } = scriptedClient([[callEvent("read")], [{ delta: "ok", type: "text" }]]);
    const summary: Message = { content: "Summary: the user said hi; read ran.", role: "user" };

    await collect(client, [tool("read")], {
      prepareTurn: async ({ turn }) => (turn === 2 ? { history: [summary] } : undefined),
    });

    expect(requests[1].messages).toEqual([summary]);
  });

  it("passes the last request's timings to prepareTurn", async () => {
    const seen: unknown[] = [];
    const { client } = scriptedClient([
      [{ timings: { prompt_n: 40 }, type: "timings" }, callEvent("read")],
      [],
    ]);

    await collect(client, [tool("read")], {
      prepareTurn: async ({ timings }) => void seen.push(timings),
    });

    expect(seen).toEqual([undefined, { prompt_n: 40 }]);
  });

  it("ends with an error event when prepareTurn throws", async () => {
    const { client, requests } = scriptedClient([[]]);
    const events = await collect(client, [], {
      prepareTurn: async () => {
        throw new Error("compaction failed");
      },
    });

    expect(requests).toHaveLength(0);
    expect(types(events)).toEqual(["turn_start", "error"]);
  });

  it("runs a call to a tool that resolveTool finds, without listing it", async () => {
    const { client, requests } = scriptedClient([[callEvent("hidden")], []]);
    const asked: string[] = [];
    const events = await collect(client, [tool("search")], {
      authorize: async (call) => (asked.push(call.function.name), { type: "allow" }),
      resolveTool: (name) => (name === "hidden" ? tool("hidden") : undefined),
    });

    expect(results(events)[0]).toMatchObject({ result: { content: "hidden ran" } });
    expect(asked).toEqual(["hidden"]);
    expect(requests[1].tools?.map((t) => t.function.name)).toEqual(["search"]);
  });

  it("still reports an unknown tool when resolveTool finds nothing", async () => {
    const { client } = scriptedClient([[callEvent("ghost")], []]);
    const events = await collect(client, [], { resolveTool: () => undefined });

    expect(results(events)[0]).toMatchObject({ result: { content: "Error: Unknown tool: ghost" } });
  });
});
