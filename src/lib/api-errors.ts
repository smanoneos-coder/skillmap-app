export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "AUTH_SERVICE_UNAVAILABLE"
  | "OPENAI_RATE_LIMITED"
  | "OPENAI_TEMPORARY_ERROR"
  | "OPENAI_INVALID_RESPONSE"
  | "OPENAI_NOT_CONFIGURED"
  | "GENERATOR_INVALID_RESPONSE"
  | "INTERNAL_ERROR";

export function apiError(code: ApiErrorCode, message: string, status: number) {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}
