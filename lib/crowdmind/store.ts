import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Post } from "./schema";
import type { Space } from "../roles";
import { SEED_POSTS } from "./seed";

const g = globalThis as unknown as { __convozaPosts?: Post[]; __convozaSb?: SupabaseClient | null };

function supabase(): SupabaseClient | null {
  if (g.__convozaSb !== undefined) return g.__convozaSb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  g.__convozaSb = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return g.__convozaSb;
}

function memory(): Post[] {
  g.__convozaPosts ??= [...SEED_POSTS];
  return g.__convozaPosts;
}

export function storeKind(): "supabase" | "memory" {
  return supabase() ? "supabase" : "memory";
}

export async function listPosts(spaces: Space[], limit = 50): Promise<Post[]> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb
      .from("crowdmind_posts").select("*").in("space", spaces).order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id, space: r.space, author: r.author, role: r.role, text: r.text, tag: r.tag,
      summary: r.summary, items: r.items ?? [], createdAt: r.created_at,
    }));
  }
  return memory().filter((p) => spaces.includes(p.space)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function addPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb
      .from("crowdmind_posts")
      .insert({ space: post.space, author: post.author, role: post.role, text: post.text, tag: post.tag, summary: post.summary, items: post.items })
      .select().single();
    if (error) throw new Error(error.message);
    return {
      id: data.id, space: data.space, author: data.author, role: data.role, text: data.text, tag: data.tag,
      summary: data.summary, items: data.items ?? [], createdAt: data.created_at,
    };
  }
  const full: Post = { ...post, id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString() };
  memory().unshift(full);
  return full;
}
