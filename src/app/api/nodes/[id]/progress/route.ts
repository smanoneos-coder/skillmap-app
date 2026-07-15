import { z } from "zod";

import { PROGRESS_STATUSES } from "@/constants/status";
import { apiError } from "@/lib/api-errors";
import {
  AuthenticationRequiredError,
  AuthServiceError,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { updateNodeProgress } from "@/lib/skillmap-repository";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateProgressRequestSchema = z.object({
  status: z.enum(PROGRESS_STATUSES),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserForApi();

  if (!authResult.success) {
    return authResult.response;
  }

  const params = paramsSchema.safeParse(await context.params);

  if (!params.success) {
    return apiError("BAD_REQUEST", "Node id is invalid.", 400);
  }

  const body = await parseJsonBody(request);

  if (!body.success) {
    return apiError("BAD_REQUEST", body.message, 400);
  }

  const parsedRequest = updateProgressRequestSchema.safeParse(body.data);

  if (!parsedRequest.success) {
    return apiError("BAD_REQUEST", "Progress status is invalid.", 400);
  }

  const progress = await updateNodeProgress({
    userId: authResult.user.id,
    nodeId: params.data.id,
    status: parsedRequest.data.status,
  });

  if (!progress) {
    return apiError("NOT_FOUND", "Node was not found.", 404);
  }

  return Response.json({
    data: {
      nodeId: progress.nodeId,
      status: progress.status,
      updatedAt: progress.updatedAt.toISOString(),
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
