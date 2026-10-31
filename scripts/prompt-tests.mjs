// Gemma prompt tests: 10 order messages and 6 Crowdmind posts, run against a RUNNING app.
//   npm run dev        (in one terminal)
//   npm run test:prompts   (in another)   BASE_URL=http://localhost:3000 by default
// Run this after every prompt change. Posts that pass moderation are published to the dev feed.

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0, fail = 0;

const norm = (s) => String(s ?? "").toLowerCase();
const find = (items, word) => items.find((i) => norm(`${i.variant ?? ""} ${i.name}`).includes(word));

const orderCases = [
  ["Hinglish multi-item", "2 copy aur ek sharpener bhej dena", (r) => r.intent === "order" && find(r.items, "notebook")?.quantity === 2 && find(r.items, "sharpener")?.quantity === 1],
  ["Variant + 'bhi'", "black pen bhi 3", (r) => r.intent === "order" && find(r.items, "black")?.quantity === 3],
  ["Vague amount stays null", "kuch pens bhi", (r) => r.intent === "order" && find(r.items, "pen")?.quantity === null],
  ["Cancel with variant", "red pen nahi chahiye ab", (r) => r.intent === "cancel" && !!find(r.items, "red")],
  ["Reference to someone else", "mere liye bhi same", (r) => r.items.length === 0 && r.unclear === true],
  ["Not an order", "sab theek hai, kal milte hain", (r) => r.intent === "chatter" && r.items.length === 0],
  ["Hindi number words", "teen blue notebooks aur char A4 sheets", (r) => find(r.items, "notebook")?.quantity === 3 && find(r.items, "a4")?.quantity === 4],
  ["Dozen", "one dozen pencils", (r) => find(r.items, "pencil")?.quantity === 12],
  ["Cancel without variant", "my notebooks cancel kar do", (r) => r.intent === "cancel" && !!find(r.items, "notebook")],
  ["Quote is real", "5 black pen bhi", (r) => r.items.length > 0 && r.items.every((i) => norm("5 black pen bhi").includes(norm(i.source)))],
];

const postCases = [
  ["Stock post with prices", "merchant", "shops", "Fresh stock: Classmate notebook Rs 45 each, A4 sheets 250 for Rs 160. Delivery in hostel.", (s, d) => s === 201 && d.post.tag === "stock" && d.post.items.some((i) => i.price === 45)],
  ["Offer", "merchant", "shops", "Diwali offer: 5 kg atta Rs 240, offer till Sunday.", (s, d) => s === 201 && ["offer", "stock"].includes(d.post.tag)],
  ["Group order call", "community", "groups", "Order call: stationery run tomorrow 5 pm. Send your list before 4.", (s, d) => s === 201 && d.post.tag === "order_call"],
  ["Quote request", "consumer", "buyers", "Anyone selling a scientific calculator near Kothrud? Need a quote.", (s, d) => s === 201 && d.post.tag === "quote_request"],
  ["OTP scam blocked", "merchant", "shops", "Share your OTP to claim the cashback and send Rs 500 advance on UPI", (s, d) => s === 422 && d.blocked === true],
  ["Advance-payment scam blocked", "merchant", "shops", "Book a brand new iPhone at Rs 5000 only. Pay Rs 1000 advance to this number first, we will send a QR to receive the rest.", (s, d) => s === 422 && d.blocked === true],
];

function report(name, ok, extra = "") {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`);
}

console.log(`Order parsing (${BASE})`);
for (const [name, text, check] of orderCases) {
  try {
    const res = await fetch(`${BASE}/api/parse`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sender: "Tester", text }) });
    const data = await res.json();
    report(name, res.ok && check(data.result), JSON.stringify(data));
  } catch (e) { report(name, false, String(e)); }
}

console.log("\nModeration");
for (const [name, role, space, text, check] of postCases) {
  try {
    const res = await fetch(`${BASE}/api/crowdmind/posts`, { method: "POST", headers: { "content-type": "application/json", "x-convoza-role": role }, body: JSON.stringify({ space, author: "Tester", text }) });
    const data = await res.json();
    report(name, check(res.status, data), `${res.status} ${JSON.stringify(data)}`);
  } catch (e) { report(name, false, String(e)); }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
