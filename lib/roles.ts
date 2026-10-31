export type Role = "consumer" | "community" | "merchant";
export type Space = "buyers" | "groups" | "shops";

export const ROLES: Role[] = ["consumer", "community", "merchant"];
export const SPACES: Space[] = ["buyers", "groups", "shops"];

export const ROLE_INFO: Record<Role, { label: string; blurb: string; billFrom: string; billTo: string }> = {
  consumer: {
    label: "Consumer",
    blurb: "You buy for yourself. Bills come from a shop, addressed to you.",
    billFrom: "the shop",
    billTo: "you",
  },
  community: {
    label: "Community",
    blurb: "You run a hostel, class or society group. Bills are split per person.",
    billFrom: "your group",
    billTo: "each member",
  },
  merchant: {
    label: "Merchant",
    blurb: "You run a shop. You get one bill per customer.",
    billFrom: "your shop",
    billTo: "each customer",
  },
};

export const SPACE_INFO: Record<Space, { label: string; blurb: string }> = {
  buyers: { label: "Buyers", blurb: "People asking for quotes and stock." },
  groups: { label: "Groups", blurb: "Group order calls from hostels, classes and societies." },
  shops: { label: "Shops", blurb: "Stock, offers and prices from local shops." },
};

const READ: Record<Role, Space[]> = {
  consumer: ["buyers", "shops"],
  community: ["groups", "shops"],
  merchant: ["shops", "buyers", "groups"],
};
const POST: Record<Role, Space[]> = {
  consumer: ["buyers"],
  community: ["groups"],
  merchant: ["shops"],
};

export function isRole(x: unknown): x is Role {
  return typeof x === "string" && (ROLES as string[]).includes(x);
}
export function isSpace(x: unknown): x is Space {
  return typeof x === "string" && (SPACES as string[]).includes(x);
}
export function canRead(role: Role, space: Space): boolean {
  return READ[role].includes(space);
}
export function canPost(role: Role, space: Space): boolean {
  return POST[role].includes(space);
}
export function readableSpaces(role: Role): Space[] {
  return READ[role];
}
export function postableSpaces(role: Role): Space[] {
  return POST[role];
}
export function homeSpace(role: Role): Space {
  return POST[role][0];
}
