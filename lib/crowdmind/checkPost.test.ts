import { describe, expect, it } from "vitest";
import { checkPost, guardPost, prefilter } from "./checkPost";
import type { PostCheck } from "./schema";

const base = (items: PostCheck["items"]): PostCheck => ({
  tag: "stock", summary: "s", items, moderation: { allowed: true, category: "ok", reason: null },
});

describe("prefilter", () => {
  it.each([
    "Share your OTP to get cashback", "send me your UPI PIN", "otp bhej do jaldi", "pay a processing fee first", "apna OTP bata dena",
  ])("blocks: %s", (t) => expect(prefilter(t).blocked).toBe(true));
  it.each([
    "Classmate notebook Rs 45 each", "UPI accepted, pay on delivery", "Our shop OTP-free billing", "Order by 5 pm",
  ])("allows: %s", (t) => expect(prefilter(t).blocked).toBe(false));
});

describe("guardPost", () => {
  it("drops items whose quote isn't in the post", () => {
    const out = guardPost(base([{ name: "pen", variant: null, price: 10, unit: null, source: "pen Rs 10" }]), "notebook Rs 45");
    expect(out.items).toHaveLength(0);
  });
  it("keeps a price written in its quote", () => {
    const out = guardPost(base([{ name: "notebook", variant: null, price: 45, unit: null, source: "notebook Rs 45" }]), "notebook Rs 45 each");
    expect(out.items[0].price).toBe(45);
  });
  it("removes an invented price", () => {
    const out = guardPost(base([{ name: "notebook", variant: null, price: 40, unit: null, source: "notebook Rs 45" }]), "notebook Rs 45 each");
    expect(out.items[0].price).toBeNull();
  });
  it("handles commas in prices", () => {
    const out = guardPost(base([{ name: "chair", variant: null, price: 1200, unit: null, source: "chair Rs 1,200" }]), "chair Rs 1,200");
    expect(out.items[0].price).toBe(1200);
  });
  it("does not match a price inside a bigger number", () => {
    const out = guardPost(base([{ name: "pen", variant: null, price: 10, unit: null, source: "pen Rs 100" }]), "pen Rs 100");
    expect(out.items[0].price).toBeNull();
  });
});

describe("checkPost", () => {
  it("runs the model result through the guard", async () => {
    const fake = (async () => base([
      { name: "notebook", variant: null, price: 45, unit: null, source: "notebook Rs 45" },
      { name: "ghost", variant: null, price: 1, unit: null, source: "ghost item" },
    ])) as never;
    const out = await checkPost("Shop", "notebook Rs 45 each", fake);
    expect(out.items.map((i) => i.name)).toEqual(["notebook"]);
  });
});
