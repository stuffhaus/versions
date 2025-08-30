import { NextResponse } from "next/server";
import { z } from "zod";

// GitHub Webhook Schemas
export const GitHubWebhookPayloadSchema = z.object({
  installation: z.object({
    id: z.number(),
  }),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    owner: z.object({
      login: z.string(),
    }),
  }),
  head_commit: z.object({
    id: z.string(),
    message: z.string(),
    added: z.array(z.string()),
    removed: z.array(z.string()),
    modified: z.array(z.string()),
  }),
});

export const VersionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  changelogId: z.string(),
  version: z.string(),
  releaseDate: z.date().nullable(),
  content: z.unknown(),
  updatedAt: z.date(),
  createdAt: z.date(),
});

export const VersionsListResponseSchema = z.object({
  versions: z.array(VersionSchema),
});

export const GitHubCallbackQuerySchema = z.object({
  installation_id: z.string().min(1, "Installation ID is required"),
  setup_action: z.string().optional(),
});

export const WebhookSuccessResponseSchema = z.object({
  message: z.string(),
  newVersions: z.number(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
});

export type GitHubWebhookPayload = z.infer<typeof GitHubWebhookPayloadSchema>;
export type Version = z.infer<typeof VersionSchema>;
export type VersionsListResponse = z.infer<typeof VersionsListResponseSchema>;
export type GitHubCallbackQuery = z.infer<typeof GitHubCallbackQuerySchema>;
export type WebhookSuccessResponse = z.infer<
  typeof WebhookSuccessResponseSchema
>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function createSuccessResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues
          .map(
            (issue) => `${issue.path.join(".") || "field"}: ${issue.message}`,
          )
          .join(", "),
      };
    }

    return { success: false, error: "Invalid request format" };
  }
}
