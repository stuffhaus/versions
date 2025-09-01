import { database } from "@/lib/database";
import { changelogs, versions, installations } from "@/database/schema";
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

// Verify GitHub webhook signature using HMAC SHA-256
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

// Process GitHub webhook push events for CHANGELOG.md updates
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-hub-signature-256");
    const githubEvent = request.headers.get("x-github-event");

    if (!signature) {
      return createErrorResponse("No signature provided", 401);
    }

    // Handle different GitHub events
    if (
      !["push", "installation", "installation_repositories"].includes(
        githubEvent || "",
      )
    ) {
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

    // Handle different GitHub webhook events
    switch (githubEvent) {
      case "installation": {
        const { action, installation } = parsedPayload;

        switch (action) {
          case "deleted":
            // User uninstalled the app - clean up their data
            await database.transaction(async (tx) => {
              // First find the installation record by GitHub installation ID
              const installationRecord = await tx
                .select()
                .from(installations)
                .where(
                  eq(installations.installationId, installation.id.toString()),
                )
                .limit(1);

              if (installationRecord.length === 0) {
                console.log(
                  `Installation ${installation.id} not found in database`,
                );
                return;
              }

              const installationUuid = installationRecord[0].id;

              // Get all changelogs for this installation
              const installationChangelogs = await tx
                .select()
                .from(changelogs)
                .where(eq(changelogs.installationId, installationUuid));

              // Delete all versions for these changelogs
              for (const changelog of installationChangelogs) {
                await tx
                  .delete(versions)
                  .where(eq(versions.changelogId, changelog.id));
              }

              // Delete all changelogs for this installation
              await tx
                .delete(changelogs)
                .where(eq(changelogs.installationId, installationUuid));

              // Delete the installation record
              await tx
                .delete(installations)
                .where(eq(installations.id, installationUuid));
            });

            console.log(
              `Cleaned up data for uninstalled app: installation ${installation.id}`,
            );
            return createSuccessResponse({
              message: "Installation cleanup completed",
            });

          default:
            return createSuccessResponse({
              message: "Installation event processed",
            });
        }
      }

      case "installation_repositories": {
        const { action, installation, repositories_removed } = parsedPayload;

        switch (action) {
          case "removed":
            if (!repositories_removed) {
              return createSuccessResponse({
                message: "No repositories to remove",
              });
            }

            // User removed specific repositories from the app
            await database.transaction(async (tx) => {
              // First find the installation record by GitHub installation ID
              const installationRecord = await tx
                .select()
                .from(installations)
                .where(
                  eq(installations.installationId, installation.id.toString()),
                )
                .limit(1);

              if (installationRecord.length === 0) {
                console.log(
                  `Installation ${installation.id} not found in database`,
                );
                return;
              }

              const installationUuid = installationRecord[0].id;

              for (const repo of repositories_removed) {
                // Get changelogs for this specific repo
                const repoChangelogs = await tx
                  .select()
                  .from(changelogs)
                  .where(
                    and(
                      eq(changelogs.installationId, installationUuid),
                      eq(changelogs.repositoryId, repo.id),
                    ),
                  );

                // Delete versions and changelogs for removed repositories
                for (const changelog of repoChangelogs) {
                  await tx
                    .delete(versions)
                    .where(eq(versions.changelogId, changelog.id));
                  await tx
                    .delete(changelogs)
                    .where(eq(changelogs.id, changelog.id));
                }
              }
            });

            console.log(
              `Cleaned up data for removed repositories from installation ${installation.id}`,
            );
            return createSuccessResponse({
              message: "Repository removal cleanup completed",
            });

          default:
            return createSuccessResponse({
              message: "Installation repositories event processed",
            });
        }
      }

      case "push": {
        // Handle push events
        const validation = validateRequest(
          GitHubWebhookPayloadSchema,
          parsedPayload,
        );

        if (!validation.success) {
          return createErrorResponse(
            `Invalid payload: ${validation.error}`,
            400,
          );
        }

        const payload = validation.data;
        const { installation, repository, head_commit } = payload;

        // Only process commits that modify CHANGELOG.md
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

        const existingVersionSet = new Set(
          existingVersions.map((v) => v.version),
        );

        // Filter out versions that already exist in database
        const newVersions = parsed.releases.filter(
          (release) =>
            release.version && !existingVersionSet.has(release.version),
        );

        if (newVersions.length > 0) {
          // Update changelog and insert new versions atomically
          await database.transaction(async (tx) => {
            await tx
              .update(changelogs)
              .set({
                raw: changelogContent,
                description: changelog.description,
              })
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
      }

      default:
        return createSuccessResponse({ message: "Event ignored" });
    }
  } catch (error) {
    console.error("Webhook processing error:", error);

    return createErrorResponse("Internal server error", 500);
  }
}
