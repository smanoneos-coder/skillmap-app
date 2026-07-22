import { z } from "zod";

import { apiError } from "@/lib/api-errors";
import {
  AuthenticationRequiredError,
  AuthServiceError,
  requireAuthenticatedUser,
} from "@/lib/auth";
import {
  generatedSkillMapSchema,
  generateSkillMapRequestSchema,
  validateGeneratedSkillMapTree,
} from "@/lib/skillmap-schema";
import { listSavedSkillMaps, saveSkillMap, SkillMapPersistenceError } from "@/lib/skillmap-repository";

export const runtime = "nodejs";

const saveSkillMapRequestSchema = z.object({
  prompt: generateSkillMapRequestSchema.shape.theme,
  data: generatedSkillMapSchema,
});

export async function GET() {
  const authResult = await getAuthenticatedUserForApi();

  if (!authResult.success) {
    return authResult.response;
  }

  const skillMaps = await listSavedSkillMaps(authResult.user.id);

  return Response.json({
    data: skillMaps,
  });
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUserForApi();

  if (!authResult.success) {
    return authResult.response;
  }

  const body = await parseJsonBody(request);

  if (!body.success) {
    return apiError("BAD_REQUEST", body.message, 400);
  }

  const parsedRequest = saveSkillMapRequestSchema.safeParse(body.data);

  if (!parsedRequest.success) {
    return apiError("BAD_REQUEST", "Skill map payload is invalid.", 400);
  }

  const treeValidation = validateGeneratedSkillMapTree(parsedRequest.data.data);

  if (!treeValidation.success) {
    return apiError("BAD_REQUEST", treeValidation.message, 400);
  }

  let savedSkillMap;

  try {
    savedSkillMap = await saveSkillMap({
      userId: authResult.user.id,
      prompt: parsedRequest.data.prompt,
      skillMap: parsedRequest.data.data,
    });
  } catch (error) {
    if (error instanceof SkillMapPersistenceError) {
      return apiError(error.code, error.message, error.status);
    }

    return apiError("INTERNAL_ERROR", "Skill map could not be saved.", 500);
  }

  return Response.json(
    {
      data: savedSkillMap,
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
