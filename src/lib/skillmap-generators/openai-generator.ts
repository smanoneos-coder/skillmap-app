import OpenAI from "openai";

import { createOpenAIClient } from "@/lib/openai";
import { buildSkillMapSystemPrompt, buildSkillMapUserPrompt } from "@/lib/skillmap-prompt";
import {
  generatedSkillMapJsonSchema,
  MAX_SKILLMAP_RESPONSE_BYTES,
} from "@/lib/skillmap-schema";
import { SkillMapGenerationError } from "@/lib/skillmap-generators/types";

export async function generateOpenAISkillMap(theme: string) {
  const model = process.env.OPENAI_MODEL;

  if (!process.env.OPENAI_API_KEY || !model) {
    throw new SkillMapGenerationError(
      "OPENAI_NOT_CONFIGURED",
      "AI generation is not configured.",
      500,
    );
  }

  try {
    const openai = createOpenAIClient();
    const completion = await createSkillMapCompletion(openai, model, theme);

    const content = completion.choices[0]?.message.content;

    if (!content) {
      throw new SkillMapGenerationError(
        "OPENAI_INVALID_RESPONSE",
        "AI returned an empty response.",
        502,
      );
    }

    if (new TextEncoder().encode(content).length > MAX_SKILLMAP_RESPONSE_BYTES) {
      throw new SkillMapGenerationError(
        "OPENAI_INVALID_RESPONSE",
        "AI response was too large.",
        502,
      );
    }

    return parseGeneratedJson(content);
  } catch (error) {
    if (error instanceof SkillMapGenerationError) {
      throw error;
    }

    throw mapOpenAIError(error);
  }
}

async function createSkillMapCompletion(openai: OpenAI, model: string, theme: string) {
  const messages = [
    {
      role: "system" as const,
      content: buildSkillMapSystemPrompt(),
    },
    {
      role: "user" as const,
      content: buildSkillMapUserPrompt(theme),
    },
  ];

  try {
    return await openai.chat.completions.create({
      model,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "skill_map",
          strict: true,
          schema: generatedSkillMapJsonSchema,
        },
      },
    });
  } catch (error) {
    if (!shouldRetryWithJsonMode(error)) {
      throw error;
    }

    return openai.chat.completions.create({
      model,
      messages,
      response_format: {
        type: "json_object",
      },
    });
  }
}

function shouldRetryWithJsonMode(error: unknown) {
  if (!(error instanceof OpenAI.APIError) || error.status !== 400) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("json_schema") ||
    message.includes("response_format") ||
    message.includes("schema")
  );
}

function parseGeneratedJson(content: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new SkillMapGenerationError(
      "OPENAI_INVALID_RESPONSE",
      "AI response was not valid JSON.",
      502,
    );
  }
}

function mapOpenAIError(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 400) {
      return new SkillMapGenerationError(
        "OPENAI_BAD_REQUEST",
        "AI model or response format is not supported. Check OPENAI_MODEL.",
        502,
      );
    }

    if (error.status === 401 || error.status === 403) {
      return new SkillMapGenerationError(
        "OPENAI_AUTH_FAILED",
        "OpenAI API authentication failed. Check OPENAI_API_KEY.",
        502,
      );
    }

    if (error.status === 404) {
      return new SkillMapGenerationError(
        "OPENAI_MODEL_NOT_FOUND",
        "OpenAI model was not found. Check OPENAI_MODEL.",
        502,
      );
    }

    if (error.status === 429) {
      return new SkillMapGenerationError(
        "OPENAI_RATE_LIMITED",
        "AI generation is rate limited. Try again later.",
        429,
      );
    }

    if (error.status && error.status >= 500) {
      return new SkillMapGenerationError(
        "OPENAI_TEMPORARY_ERROR",
        "AI service is temporarily unavailable.",
        503,
      );
    }

    return new SkillMapGenerationError("OPENAI_TEMPORARY_ERROR", "AI generation failed.", 502);
  }

  return new SkillMapGenerationError("INTERNAL_ERROR", "Unexpected server error.", 500);
}
