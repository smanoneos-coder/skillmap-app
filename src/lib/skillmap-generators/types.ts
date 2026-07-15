import type { ApiErrorCode } from "@/lib/api-errors";
export type SkillMapGeneratorMode = "mock" | "openai";

export type SkillMapGenerationResult = {
  mode: SkillMapGeneratorMode;
  skillMap: unknown;
};

export class SkillMapGenerationError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = "SkillMapGenerationError";
    this.code = code;
    this.status = status;
  }
}
