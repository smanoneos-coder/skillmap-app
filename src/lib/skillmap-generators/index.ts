import { generateMockSkillMap } from "@/lib/skillmap-generators/mock-generator";
import {
  SkillMapGenerationError,
  type SkillMapGenerationResult,
  type SkillMapGeneratorMode,
} from "@/lib/skillmap-generators/types";

export function getSkillMapGeneratorMode(): SkillMapGeneratorMode {
  const mode = process.env.SKILLMAP_GENERATOR_MODE ?? "mock";

  if (mode === "mock" || mode === "openai") {
    return mode;
  }

  throw new SkillMapGenerationError(
    "INTERNAL_ERROR",
    "Skill map generator is not configured correctly.",
    500,
  );
}

export async function generateSkillMap(theme: string): Promise<SkillMapGenerationResult> {
  const mode = getSkillMapGeneratorMode();

  if (mode === "mock") {
    return {
      mode,
      skillMap: await generateMockSkillMap(theme),
    };
  }

  const { generateOpenAISkillMap } = await import("@/lib/skillmap-generators/openai-generator");

  return {
    mode,
    skillMap: await generateOpenAISkillMap(theme),
  };
}

export { SkillMapGenerationError };
export type { SkillMapGenerationResult, SkillMapGeneratorMode };
