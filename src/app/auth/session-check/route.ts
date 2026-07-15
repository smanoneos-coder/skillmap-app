import { NextResponse } from "next/server";

import { AuthServiceError, getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json(
        {
          authenticated: false,
          error: {
            code: "AUTH_SERVICE_UNAVAILABLE",
            message: "Authentication service is unavailable.",
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        authenticated: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected server error.",
        },
      },
      { status: 500 },
    );
  }
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
