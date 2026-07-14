import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

export async function syncAuthenticatedUser() {
  const user = await requireAuthenticatedUser();

  return syncSupabaseUser(user);
}

export async function syncSupabaseUser(user: SupabaseUser) {
  return prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email,
      name: getStringMetadata(user.user_metadata.name),
      avatarUrl: getStringMetadata(user.user_metadata.avatar_url),
    },
    create: {
      id: user.id,
      email: user.email,
      name: getStringMetadata(user.user_metadata.name),
      avatarUrl: getStringMetadata(user.user_metadata.avatar_url),
    },
  });
}

function getStringMetadata(value: unknown) {
  return typeof value === "string" ? value : null;
}
