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
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: buildSkillMapSystemPrompt(),
        },
        {
          role: "user",
          content: buildSkillMapUserPrompt(theme),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "skill_map",
          strict: true,
          schema: generatedSkillMapJsonSchema,
        },
      },
      temperature: 0.2,
    });

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
