import { NextResponse } from "next/server";
import { z } from "zod";
import { canPost, canRead, isRole, isSpace, readableSpaces, type Role, type Space } from "@/lib/roles";
import { checkPost, prefilter } from "@/lib/crowdmind/checkPost";
import { addPost, listPosts } from "@/lib/crowdmind/store";
import { allow, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

function roleOf(req: Request): Role | null {
  const r = req.headers.get("x-convoza-role");
  return isRole(r) ? r : null;
}

/** Feed for a space. The server checks the role can read it. (Roles are self-chosen in this demo.) */
export async function GET(req: Request) {
  const role = roleOf(req);
  if (!role) return NextResponse.json({ error: "Choose a role first." }, { status: 401 });
  const space = new URL(req.url).searchParams.get("space");
  let spaces: Space[];
  if (space) {
    if (!isSpace(space) || !canRead(role, space)) return NextResponse.json({ error: "Your role can't read this space." }, { status: 403 });
    spaces = [space];
  } else {
    spaces = readableSpaces(role);
  }
  try {
    return NextResponse.json({ posts: await listPosts(spaces) });
  } catch {
    return NextResponse.json({ error: "Couldn't load posts." }, { status: 500 });
  }
}

const PostBody = z.object({
  space: z.string(),
  author: z.string().trim().min(1).max(60),
  text: z.string().trim().min(8, "Write at least a short sentence.").max(600),
});

/** Gemma job 2: check a post, then publish it. If Gemma can't check it, it isn't published. */
export async function POST(req: Request) {
  const role = roleOf(req);
  if (!role) return NextResponse.json({ error: "Choose a role first." }, { status: 401 });
  if (!allow(`post:${clientKey(req)}`, 30)) return NextResponse.json({ error: "Too many posts. Wait a minute." }, { status: 429 });

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid post." }, { status: 400 });
  const { space, author, text } = parsed.data;
  if (!isSpace(space) || !canPost(role, space)) return NextResponse.json({ error: "Your role can't post in this space." }, { status: 403 });

  const pre = prefilter(text);
  if (pre.blocked) return NextResponse.json({ blocked: true, category: pre.category, reason: pre.reason }, { status: 422 });

  let check;
  try {
    check = await checkPost(author, text);
  } catch {
    return NextResponse.json({ error: "Couldn't check this post, so it wasn't published. Try again." }, { status: 503 });
  }
  if (!check.moderation.allowed) {
    return NextResponse.json(
      { blocked: true, category: check.moderation.category, reason: check.moderation.reason ?? "This post was blocked." },
      { status: 422 },
    );
  }
  try {
    const post = await addPost({ space, author, role, text, tag: check.tag, summary: check.summary, items: check.items });
    return NextResponse.json({ post }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Checked, but couldn't save the post. Try again." }, { status: 500 });
  }
}
