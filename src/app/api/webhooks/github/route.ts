import { database } from "@/lib/database";
import { changelogs, versions } from "@/database/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { createGitHubClient } from "@/lib/github";
import { parser } from "keep-a-changelog";
import crypto from "crypto";
import {
  GitHubWebhookPayloadSchema,
  validateRequest,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/api-types";

function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = `sha256=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-hub-signature-256");
    const githubEvent = request.headers.get("x-github-event");

    if (!signature) {
      return createErrorResponse("No signature provided", 401);
    }

    if (githubEvent !== "push") {
      return createSuccessResponse({ message: "Event ignored" });
    }

    const body = await request.text();
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("GITHUB_WEBHOOK_SECRET not configured");

      return createErrorResponse("Webhook secret not configured", 500);
    }

    if (!verifySignature(body, signature, webhookSecret)) {
      return createErrorResponse("Invalid signature", 401);
    }

    let parsedPayload;

    try {
      parsedPayload = JSON.parse(body);
    } catch {
      return createErrorResponse("Invalid JSON payload", 400);
    }

    const validation = validateRequest(
      GitHubWebhookPayloadSchema,
      parsedPayload,
    );

    if (!validation.success) {
      return createErrorResponse(`Invalid payload: ${validation.error}`, 400);
    }

    const payload = validation.data;
    const { installation, repository, head_commit } = payload;

    const changelogFiles = ["CHANGELOG.md"];
    const hasChangelogUpdate =
      head_commit.modified.some((file) => changelogFiles.includes(file)) ||
      head_commit.added.some((file) => changelogFiles.includes(file));

    if (!hasChangelogUpdate) {
      return createSuccessResponse({
        message: "No changelog changes detected",
      });
    }

    const existingChangelog = await database
      .select()
      .from(changelogs)
      .where(
        and(
          eq(changelogs.owner, repository.owner.login),
          eq(changelogs.name, repository.name),
          eq(changelogs.repositoryId, repository.id),
        ),
      )
      .limit(1);

    if (existingChangelog.length === 0) {
      console.log(
        `Changelog not found for ${repository.owner.login}/${repository.name}`,
      );

      return createErrorResponse("Changelog not found in database", 404);
    }

    const changelog = existingChangelog[0];
    const octokit = createGitHubClient(installation.id.toString());
    let changelogContent;

    try {
      const response = await octokit.rest.repos.getContent({
        owner: repository.owner.login,
        repo: repository.name,
        path: "CHANGELOG.md",
      });

      if (!Array.isArray(response.data) && response.data.type === "file") {
        changelogContent = Buffer.from(
          response.data.content,
          "base64",
        ).toString();
      } else {
        throw new Error("Changelog content not found");
      }
    } catch (error) {
      console.error("Failed to fetch changelog content:", error);

      return createErrorResponse("Failed to fetch changelog content", 500);
    }

    const parsed = parser(changelogContent);

    const existingVersions = await database
      .select({ version: versions.version })
      .from(versions)
      .where(eq(versions.changelogId, changelog.id));

    const existingVersionSet = new Set(existingVersions.map((v) => v.version));

    const newVersions = parsed.releases.filter(
      (release) => release.version && !existingVersionSet.has(release.version),
    );

    if (newVersions.length > 0) {
      await database.transaction(async (tx) => {
        await tx
          .update(changelogs)
          .set({ raw: changelogContent })
          .where(eq(changelogs.id, changelog.id));

        for (const version of newVersions) {
          await tx.insert(versions).values({
            userId: changelog.userId,
            changelogId: changelog.id,
            version: version.version!,
            releaseDate: version.date,
            content: version.toString(),
          });
        }
      });

      console.log(
        `Added ${newVersions.length} new versions for ${repository.owner.login}/${repository.name}`,
      );
    }

    return createSuccessResponse({
      message: "Webhook processed successfully",
      newVersions: newVersions.length,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);

    return createErrorResponse("Internal server error", 500);
  }
}
