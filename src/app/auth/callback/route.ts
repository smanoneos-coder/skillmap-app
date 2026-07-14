import { NextResponse } from "next/server";

import { syncSupabaseUser } from "@/lib/auth";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=missing-code", requestUrl.origin));
  }

  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logSafeAuthError("OAuth code exchange failed", error);
    return NextResponse.redirect(new URL("/?auth=exchange-error", requestUrl.origin));
  }

  const accessToken = data.session?.access_token;

  if (!accessToken) {
    console.error("OAuth code exchange did not return a session.");
    return NextResponse.redirect(new URL("/?auth=missing-session", requestUrl.origin));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    logSafeAuthError("OAuth user lookup failed", userError);
    return NextResponse.redirect(new URL("/?auth=user-error", requestUrl.origin));
  }

  try {
    await syncSupabaseUser(user);
  } catch (syncError) {
    logSafeAuthError("Public user sync failed", syncError);
    return NextResponse.redirect(new URL("/?auth=sync-error", requestUrl.origin));
  }

  return applyCookies(NextResponse.redirect(new URL(nextPath, requestUrl.origin)));
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/skillmaps";
  }

  return value;
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
