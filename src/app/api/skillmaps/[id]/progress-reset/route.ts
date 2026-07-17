import { z } from "zod";

import { apiError } from "@/lib/api-errors";
import {
  AuthenticationRequiredError,
  AuthServiceError,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { resetSkillMapProgress } from "@/lib/skillmap-repository";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserForApi();

  if (!authResult.success) {
    return authResult.response;
  }

  const params = paramsSchema.safeParse(await context.params);

  if (!params.success) {
    return apiError("BAD_REQUEST", "Skill map id is invalid.", 400);
  }

  const reset = await resetSkillMapProgress({
    userId: authResult.user.id,
    skillMapId: params.data.id,
  });

  if (!reset) {
    return apiError("NOT_FOUND", "Skill map was not found.", 404);
  }

  return Response.json({
    data: {
      reset: true,
    },
  });
}

async function getAuthenticatedUserForApi() {
  try {
    return {
      success: true as const,
      user: await requireAuthenticatedUser(),
    };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return {
        success: false as const,
        response: apiError("UNAUTHORIZED", "Login is required.", 401),
      };
    }

    if (error instanceof AuthServiceError) {
      return {
        success: false as const,
        response: apiError("AUTH_SERVICE_UNAVAILABLE", "Authentication service is unavailable.", 503),
      };
    }

    return {
      success: false as const,
      response: apiError("INTERNAL_ERROR", "Unexpected server error.", 500),
    };
  }
}
