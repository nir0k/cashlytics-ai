import type { ApiResponse } from "@/types/database";

export const IMPORT_FEATURE_DISABLED_ERROR =
  "CSV import is unavailable because AI is not configured.";

export function isAiEnabled(apiKey: string | undefined = process.env.OPENAI_API_KEY): boolean {
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

export function getImportFeatureGateError<T>(
  apiKey: string | undefined = process.env.OPENAI_API_KEY
): ApiResponse<T> | null {
  if (isAiEnabled(apiKey)) {
    return null;
  }

  return {
    success: false,
    error: IMPORT_FEATURE_DISABLED_ERROR,
  };
}
