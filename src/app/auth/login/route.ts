import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const { supabase } = await createSupabaseRouteHandlerClient();
  const redirectTo = getCallbackUrl(nextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    logSafeAuthError("OAuth sign-in URL creation failed", error);
    return NextResponse.redirect(new URL("/?auth=login-error", requestUrl.origin));
  }

  return NextResponse.redirect(data.url);
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/skillmaps";
  }

  return value;
}

function getCallbackUrl(nextPath: string) {
  const callbackUrl = new URL("http://localhost:3000/auth/callback");
  callbackUrl.searchParams.set("next", nextPath);

  return callbackUrl.toString();
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
