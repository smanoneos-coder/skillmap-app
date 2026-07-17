import { z } from "zod";

import { apiError } from "@/lib/api-errors";
import {
  AuthenticationRequiredError,
  AuthServiceError,
  requireAuthenticatedUser,
} from "@/lib/auth";
import {
  saveSkillMapGraph,
  SkillMapGraphValidationError,
} from "@/lib/skillmap-repository";

export const runtime = "nodejs";

const MAX_POSITION = 100_000;
const connectionPositionSchema = z.enum(["right", "down", "left", "up"]);

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const graphNodeSchema = z.object({
  id: z.string().min(1).max(100),
  parentId: z.string().min(1).max(100).nullable(),
  title: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(30)).max(5),
  order: z.number().int().min(0).max(10_000),
  positionX: z.number().finite().min(-MAX_POSITION).max(MAX_POSITION).nullable(),
  positionY: z.number().finite().min(-MAX_POSITION).max(MAX_POSITION).nullable(),
  parentLocked: z.boolean().default(false),
  parentEdgeSourcePosition: connectionPositionSchema.nullable().default(null),
  isNew: z.boolean(),
});

const relatedEdgeSchema = z.object({
  id: z.string().min(1).max(100),
  nodeAId: z.string().min(1).max(100),
  nodeBId: z.string().min(1).max(100),
});

const graphSaveRequestSchema = z.object({
  nodes: z.array(graphNodeSchema).max(50),
  relatedEdges: z.array(relatedEdgeSchema).max(300).default([]),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const parsedRequest = graphSaveRequestSchema.safeParse(body.data);

  if (!parsedRequest.success) {
    return apiError("BAD_REQUEST", "Skill map graph payload is invalid.", 400);
  }

  try {
    const skillMap = await saveSkillMapGraph({
      userId: authResult.user.id,
      skillMapId: params.data.id,
      nodes: parsedRequest.data.nodes,
      relatedEdges: parsedRequest.data.relatedEdges,
    });

    if (!skillMap) {
      return apiError("NOT_FOUND", "Skill map was not found.", 404);
    }

    return Response.json({
      data: skillMap,
    });
  } catch (error) {
    if (error instanceof SkillMapGraphValidationError) {
      return apiError("BAD_REQUEST", error.message, 400);
    }

    console.error("Skill map graph save failed.", summarizeError(error));

    return apiError("INTERNAL_ERROR", "Unexpected server error.", 500);
  }
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

function summarizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      name: "UnknownError",
    };
  }

  const maybePrismaError = error as Error & {
    code?: string;
    meta?: {
      cause?: unknown;
    };
  };

  return {
    code: maybePrismaError.code,
    cause:
      typeof maybePrismaError.meta?.cause === "string"
        ? maybePrismaError.meta.cause.slice(0, 160)
        : undefined,
    name: error.name,
  };
}
