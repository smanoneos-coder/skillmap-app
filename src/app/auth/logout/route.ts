import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const { supabase, applyCookies } = await createSupabaseRouteHandlerClient();

  await supabase.auth.signOut();

  return applyCookies(NextResponse.redirect(new URL("/", requestUrl.origin)));
}
