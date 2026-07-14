import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();

  return NextResponse.json({
    authenticated: Boolean(user),
    user: user
      ? {
          id: maskUuid(user.id),
          email: maskEmail(user.email),
        }
      : null,
  });
}

function maskUuid(value: string) {
  return `${value.slice(0, 8)}-****-****-****-${value.slice(-12)}`;
}

function maskEmail(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [localPart, domain] = value.split("@");

  if (!localPart || !domain) {
    return "[masked-email]";
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}
