import type { Post } from "./schema";

const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

export const SEED_POSTS: Post[] = [
  {
    id: "seed-1", space: "shops", author: "Sharma Stationers", role: "merchant",
    text: "Fresh stock: Classmate notebook Rs 45 each, blue gel pen Rs 10, A4 sheets 250 for Rs 160. Hostel delivery after 6 pm.",
    tag: "stock", summary: "Notebooks, pens and A4 sheets in stock, with hostel delivery.",
    items: [
      { name: "Notebook", variant: "Classmate", price: 45, unit: "piece", source: "Classmate notebook Rs 45 each" },
      { name: "Pen", variant: "Blue Gel", price: 10, unit: "piece", source: "blue gel pen Rs 10" },
      { name: "A4 Sheet", variant: null, price: 160, unit: "250 sheets", source: "A4 sheets 250 for Rs 160" },
    ],
    createdAt: ago(35),
  },
  {
    id: "seed-2", space: "shops", author: "Gupta Kirana", role: "merchant",
    text: "Diwali offer: 5 kg atta Rs 240, 1 litre oil Rs 130. Offer till Sunday.",
    tag: "offer", summary: "Diwali offer on atta and oil until Sunday.",
    items: [
      { name: "Atta", variant: null, price: 240, unit: "5 kg", source: "5 kg atta Rs 240" },
      { name: "Oil", variant: null, price: 130, unit: "litre", source: "1 litre oil Rs 130" },
    ],
    createdAt: ago(90),
  },
  {
    id: "seed-3", space: "groups", author: "Hostel B, Block 2", role: "community",
    text: "Order call: stationery run tomorrow 5 pm. Send your list before 4.",
    tag: "order_call", summary: "Stationery order closes tomorrow at 4 pm.", items: [], createdAt: ago(20),
  },
  {
    id: "seed-4", space: "buyers", author: "Neha", role: "consumer",
    text: "Anyone selling a scientific calculator near Kothrud? Need a quote for Casio fx-991.",
    tag: "quote_request", summary: "Looking for a quote on a Casio fx-991 calculator.",
    items: [{ name: "Calculator", variant: "Casio fx-991", price: null, unit: null, source: "Casio fx-991" }],
    createdAt: ago(12),
  },
];
