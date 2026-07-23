import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient();
  const redirectTo = getCallbackUrl(requestUrl.origin, nextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    logSafeAuthError("OAuth sign-in URL creation failed", error);
    return applyCookies(NextResponse.redirect(new URL("/?auth=login-error", requestUrl.origin)));
  }

  return applyCookies(NextResponse.redirect(data.url));
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/skillmaps";
  }

  return value;
}

function getCallbackUrl(requestOrigin: string, nextPath: string) {
  const callbackUrl = new URL("/auth/callback", getSiteUrl(requestOrigin));
  callbackUrl.searchParams.set("next", nextPath);

  return callbackUrl.toString();
}

function getSiteUrl(requestOrigin: string) {
  const localSiteUrl = getLocalSiteUrl(requestOrigin);

  if (localSiteUrl) {
    return localSiteUrl;
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredSiteUrl) {
    return normalizeSiteUrl(requestOrigin);
  }

  try {
    return normalizeSiteUrl(configuredSiteUrl);
  } catch {
    return normalizeSiteUrl(requestOrigin);
  }
}

function normalizeSiteUrl(value: string) {
  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Invalid site URL protocol.");
  }

  const pathname = url.pathname.replace(/\/+$/, "");

  return `${url.origin}${pathname}`;
}

function getLocalSiteUrl(requestOrigin: string) {
  const url = new URL(requestOrigin);

  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return null;
  }

  return normalizeSiteUrl(`http://localhost${url.port ? `:${url.port}` : ""}`);
}

function logSafeAuthError(message: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(message);
    return;
  }

  const errorLike = error as { name?: unknown; message?: unknown; status?: unknown; code?: unknown };

  console.error(message, {
    name: typeof errorLike.name === "string" ? errorLike.name : undefined,
    message: typeof errorLike.message === "string" ? errorLike.message : undefined,
    status: typeof errorLike.status === "number" ? errorLike.status : undefined,
    code: typeof errorLike.code === "string" ? errorLike.code : undefined,
  });
}
