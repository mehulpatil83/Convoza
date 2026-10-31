import { describe, expect, it, vi } from "vitest";
import { readMessage } from "./readMessage";
import type { ReadResult } from "./schema";

describe("readMessage", () => {
  it("skips the model for trivial chatter", async () => {
    const call = vi.fn();
    const out = await readMessage("Rahul", "ok 👍", call as never);
    expect(out.skippedModel).toBe(true);
    expect(call).not.toHaveBeenCalled();
  });
  it("calls the model and guards the answer", async () => {
    const answer: ReadResult = {
      intent: "order", unclear: false,
      items: [
        { name: "notebook", variant: null, quantity: 2, source: "2 copy" },
        { name: "stapler", variant: null, quantity: 1, source: "ek stapler" },
      ],
    };
    const call = vi.fn().mockResolvedValue(answer);
    const out = await readMessage("Rahul", "2 copy bhej dena", call as never);
    expect(call).toHaveBeenCalledOnce();
    expect(out.result.items).toHaveLength(1);
    expect(out.dropped).toBe(1);
  });
  it("sends the sender and message to the model, fresh each time", async () => {
    const call = vi.fn().mockResolvedValue({ intent: "chatter", items: [], unclear: false });
    await readMessage("Sia", "pen chahiye", call as never);
    expect(call.mock.calls[0][1].user).toBe("Sender: Sia\nMessage: pen chahiye");
  });
});
