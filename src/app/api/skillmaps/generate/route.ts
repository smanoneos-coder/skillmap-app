import { apiError } from "@/lib/api-errors";
import {
  AuthenticationRequiredError,
  AuthServiceError,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { generateSkillMap, SkillMapGenerationError } from "@/lib/skillmap-generators";
import {
  generatedSkillMapSchema,
  generateSkillMapRequestSchema,
  generateSkillMapResponseSchema,
  validateGeneratedSkillMapTree,
} from "@/lib/skillmap-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return apiError("UNAUTHORIZED", "Login is required.", 401);
    }

    if (error instanceof AuthServiceError) {
      return apiError("AUTH_SERVICE_UNAVAILABLE", "Authentication service is unavailable.", 503);
    }

    return apiError("INTERNAL_ERROR", "Unexpected server error.", 500);
  }

  const body = await parseJsonBody(request);

  if (!body.success) {
    return apiError("BAD_REQUEST", body.message, 400);
  }

  const parsedRequest = generateSkillMapRequestSchema.safeParse(body.data);

  if (!parsedRequest.success) {
    return apiError("BAD_REQUEST", "Theme must be between 2 and 100 characters.", 400);
  }

  try {
    const generated = await generateSkillMap(parsedRequest.data.theme);
    const parsedSkillMap = generatedSkillMapSchema.safeParse(generated.skillMap);

    if (!parsedSkillMap.success) {
      return apiError(
        "GENERATOR_INVALID_RESPONSE",
        "Generated skill map did not match the schema.",
        502,
      );
    }

    const treeValidation = validateGeneratedSkillMapTree(parsedSkillMap.data);

    if (!treeValidation.success) {
      return apiError("GENERATOR_INVALID_RESPONSE", treeValidation.message, 502);
    }

    const response = generateSkillMapResponseSchema.parse({
      data: parsedSkillMap.data,
    });

    return Response.json(response, {
      headers: {
        "x-skillmap-generator-mode": generated.mode,
      },
    });
  } catch (error) {
    if (error instanceof SkillMapGenerationError) {
      return apiError(error.code, error.message, error.status);
    }

    return apiError("INTERNAL_ERROR", "Unexpected server error.", 500);
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
