import { describe, expect, it } from "vitest";
import { canPost, canRead, homeSpace, isRole, isSpace, postableSpaces, readableSpaces } from "./roles";

describe("roles", () => {
  it("validates roles and spaces", () => {
    expect(isRole("merchant")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isSpace("shops")).toBe(true);
    expect(isSpace(42)).toBe(false);
  });
  it("merchants post to shops and read everything", () => {
    expect(canPost("merchant", "shops")).toBe(true);
    expect(canPost("merchant", "buyers")).toBe(false);
    expect(readableSpaces("merchant")).toHaveLength(3);
  });
  it("consumers can't read group calls or post offers", () => {
    expect(canRead("consumer", "groups")).toBe(false);
    expect(canPost("consumer", "shops")).toBe(false);
    expect(canPost("consumer", "buyers")).toBe(true);
  });
  it("communities post to groups", () => {
    expect(postableSpaces("community")).toEqual(["groups"]);
    expect(canRead("community", "buyers")).toBe(false);
  });
  it("every role can read the space it posts in", () => {
    for (const r of ["consumer", "community", "merchant"] as const) expect(canRead(r, homeSpace(r))).toBe(true);
  });
});
