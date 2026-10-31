import { describe, expect, it } from "vitest";
import { parseChat } from "./parseChat";

describe("parseChat", () => {
  it("parses Android exports", () => {
    const m = parseChat("12/05/24, 10:15 - Rahul: 2 blue notebooks\n12/05/24, 10:16 - Ayush: black pen 3");
    expect(m.map((x) => [x.sender, x.text])).toEqual([["Rahul", "2 blue notebooks"], ["Ayush", "black pen 3"]]);
  });
  it("parses 12-hour Android timestamps", () => {
    const m = parseChat("12/05/2024, 10:15 pm - Sia: ek copy");
    expect(m[0]).toMatchObject({ sender: "Sia", text: "ek copy", time: "12/05/2024 10:15 pm" });
  });
  it("parses iOS exports", () => {
    const m = parseChat("[12/05/24, 10:15:30 AM] Rahul: pen chahiye");
    expect(m[0]).toMatchObject({ sender: "Rahul", text: "pen chahiye" });
  });
  it("parses copied 'Name: text' chats", () => {
    const m = parseChat("Rahul: 3 notebooks\nAyush: mere liye 2");
    expect(m).toHaveLength(2);
    expect(m[1].sender).toBe("Ayush");
  });
  it("joins multi-line messages in exports", () => {
    const m = parseChat("12/05/24, 10:15 - Rahul: need these:\n2 pens\n1 ruler\n12/05/24, 10:16 - Ayush: ok");
    expect(m[0].text).toBe("need these:\n2 pens\n1 ruler");
    expect(m).toHaveLength(2);
  });
  it("does not treat 'Note: x' continuation lines as a new sender in exports", () => {
    const m = parseChat("12/05/24, 10:15 - Rahul: list\nNote: urgent");
    expect(m).toHaveLength(1);
    expect(m[0].text).toContain("Note: urgent");
  });
  it("skips system messages", () => {
    const m = parseChat("12/05/24, 10:00 - Messages and calls are end-to-end encrypted.\n12/05/24, 10:01 - Rahul added Ayush\n12/05/24, 10:02 - Rahul: pen");
    expect(m).toHaveLength(1);
  });
  it("skips media and deleted messages", () => {
    const m = parseChat("12/05/24, 10:15 - Rahul: <Media omitted>\n12/05/24, 10:16 - Rahul: This message was deleted\n12/05/24, 10:17 - Rahul: pen");
    expect(m.map((x) => x.text)).toEqual(["pen"]);
  });
  it("handles Windows line endings and invisible marks", () => {
    const m = parseChat("\u200e[12/05/24, 10:15:30 AM] Rahul: pen\r\n[12/05/24, 10:16:30 AM] Ayush: ink");
    expect(m).toHaveLength(2);
  });
  it("assigns sequential ids", () => expect(parseChat("A: x1\nB: x2\nC: x3").map((x) => x.id)).toEqual([0, 1, 2]));
  it("returns nothing for empty input", () => expect(parseChat("  \n ")).toEqual([]));
  it("keeps Hindi text", () => expect(parseChat("Rahul: दो कॉपी भेज देना")[0].text).toBe("दो कॉपी भेज देना"));
});
