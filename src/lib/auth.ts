import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthServiceError extends Error {
  constructor() {
    super("Authentication service is temporarily unavailable.");
    this.name = "AuthServiceError";
  }
}

export async function getAuthenticatedUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (isMissingSessionError(error)) {
        return null;
      }

      throw new AuthServiceError();
    }

    return user ?? null;
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error;
    }

    throw new AuthServiceError();
  }
}

export async function getAuthenticatedUserForPage() {
  try {
    return await getAuthenticatedUser();
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new AuthenticationRequiredError();
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

function isMissingSessionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const errorLike = error as { name?: unknown; message?: unknown };
  const name = typeof errorLike.name === "string" ? errorLike.name : "";
  const message = typeof errorLike.message === "string" ? errorLike.message : "";

  return name === "AuthSessionMissingError" || message.toLowerCase().includes("session missing");
}

function getStringMetadata(value: unknown) {
  return typeof value === "string" ? value : null;
}
