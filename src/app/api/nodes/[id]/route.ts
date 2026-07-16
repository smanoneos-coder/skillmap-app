import { z } from "zod";

import { apiError } from "@/lib/api-errors";
import {
  AuthenticationRequiredError,
  AuthServiceError,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { deleteNode, updateNodeDetails } from "@/lib/skillmap-repository";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateNodeRequestSchema = z.object({
  title: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(30)).max(5),
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

  const parsedRequest = updateNodeRequestSchema.safeParse(body.data);

  if (!parsedRequest.success) {
    return apiError("BAD_REQUEST", "Node payload is invalid.", 400);
  }

  const node = await updateNodeDetails({
    userId: authResult.user.id,
    nodeId: params.data.id,
    title: parsedRequest.data.title,
    description: parsedRequest.data.description,
    tags: parsedRequest.data.tags,
  });

  if (!node) {
    return apiError("NOT_FOUND", "Node was not found.", 404);
  }

  return Response.json({
    data: node,
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserForApi();

  if (!authResult.success) {
    return authResult.response;
  }

  const params = paramsSchema.safeParse(await context.params);

  if (!params.success) {
    return apiError("BAD_REQUEST", "Node id is invalid.", 400);
  }

  const result = await deleteNode({
    userId: authResult.user.id,
    nodeId: params.data.id,
  });

  if (result.status === "NOT_FOUND") {
    return apiError("NOT_FOUND", "Node was not found.", 404);
  }

  if (result.status === "ROOT_NODE") {
    return apiError("BAD_REQUEST", "Root node cannot be deleted.", 400);
  }

  return Response.json({
    data: {
      deleted: true,
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
