import { z } from "zod";

import { apiError } from "@/lib/api-errors";
import {
  AuthenticationRequiredError,
  AuthServiceError,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { createChildNode } from "@/lib/skillmap-repository";

export const runtime = "nodejs";

const createChildNodeRequestSchema = z.object({
  parentId: z.string().uuid(),
  title: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(500).optional(),
});

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUserForApi();

  if (!authResult.success) {
    return authResult.response;
  }

  const body = await parseJsonBody(request);

  if (!body.success) {
    return apiError("BAD_REQUEST", body.message, 400);
  }

  const parsedRequest = createChildNodeRequestSchema.safeParse(body.data);

  if (!parsedRequest.success) {
    return apiError("BAD_REQUEST", "Node payload is invalid.", 400);
  }

  const title = parsedRequest.data.title;
  const createdNode = await createChildNode({
    userId: authResult.user.id,
    parentId: parsedRequest.data.parentId,
    title,
    description: parsedRequest.data.description ?? `${title}について学習します。`,
  });

  if (createdNode.status === "NOT_FOUND") {
    return apiError("NOT_FOUND", "Parent node was not found.", 404);
  }

  if (createdNode.status === "TOO_MANY_NODES") {
    return apiError("BAD_REQUEST", "Skill map cannot have more than 50 nodes.", 400);
  }

  if (createdNode.status === "TOO_DEEP") {
    return apiError("BAD_REQUEST", "Skill map cannot be deeper than 4 levels.", 400);
  }

  return Response.json(
    {
      data: createdNode.node,
    },
    { status: 201 },
  );
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
