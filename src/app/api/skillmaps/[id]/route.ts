import { z } from "zod";

import { apiError } from "@/lib/api-errors";
import {
  AuthenticationRequiredError,
  AuthServiceError,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { deleteSkillMap, getSavedSkillMapDetail, renameSkillMap } from "@/lib/skillmap-repository";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const renameSkillMapSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserForApi();

  if (!authResult.success) {
    return authResult.response;
  }

  const params = paramsSchema.safeParse(await context.params);

  if (!params.success) {
    return apiError("BAD_REQUEST", "Skill map id is invalid.", 400);
  }

  const skillMap = await getSavedSkillMapDetail(authResult.user.id, params.data.id);

  if (!skillMap) {
    return apiError("NOT_FOUND", "Skill map was not found.", 404);
  }

  return Response.json({
    data: skillMap,
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserForApi();

  if (!authResult.success) {
    return authResult.response;
  }

  const params = paramsSchema.safeParse(await context.params);

  if (!params.success) {
    return apiError("BAD_REQUEST", "Skill map id is invalid.", 400);
  }

  const body = await parseJsonBody(request);

  if (!body.success) {
    return apiError("BAD_REQUEST", body.message, 400);
  }

  const parsedRequest = renameSkillMapSchema.safeParse(body.data);

  if (!parsedRequest.success) {
    return apiError("BAD_REQUEST", "Skill map title is invalid.", 400);
  }

  const skillMap = await renameSkillMap({
    userId: authResult.user.id,
    skillMapId: params.data.id,
    title: parsedRequest.data.title,
  });

  if (!skillMap) {
    return apiError("NOT_FOUND", "Skill map was not found.", 404);
  }

  return Response.json({
    data: skillMap,
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserForApi();

  if (!authResult.success) {
    return authResult.response;
  }

  const params = paramsSchema.safeParse(await context.params);

  if (!params.success) {
    return apiError("BAD_REQUEST", "Skill map id is invalid.", 400);
  }

  const deleted = await deleteSkillMap({
    userId: authResult.user.id,
    skillMapId: params.data.id,
  });

  if (!deleted) {
    return apiError("NOT_FOUND", "Skill map was not found.", 404);
  }

  return new Response(null, {
    status: 204,
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

async function parseJsonBody(request: Request) {
  try {
    return {
      success: true as const,
      data: await request.json(),
    };
  } catch {
    return {
      success: false as const,
      message: "Request body must be valid JSON.",
    };
  }
}
