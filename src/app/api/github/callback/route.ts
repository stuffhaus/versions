import { database } from "@/lib/database";
import { stackServerApp } from "@/stack";
import { NextRequest, NextResponse } from "next/server";
import { createGitHubClient } from "@/lib/github";
import { changelogs, installations, versions } from "@/database/schema";
import { parser } from "keep-a-changelog";
import {
  GitHubCallbackQuerySchema,
  validateRequest,
  createErrorResponse,
} from "@/lib/api-types";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const queryData = {
      installation_id: searchParams.get("installation_id") || "",
      setup_action: searchParams.get("setup_action") || undefined,
    };

    const validation = validateRequest(GitHubCallbackQuerySchema, queryData);
    if (!validation.success) {
      console.error("No installation ID found in URL");
      return createErrorResponse("No installation ID found", 400);
    }

    const { installation_id: installationId, setup_action: setupAction } =
      validation.data;

    if (setupAction === "install") {
      const installed = await database
        .insert(installations)
        .values({
          installationId,
          userId: user.id,
        })
        .returning();

      const octokit = createGitHubClient(installationId);

      const {
        data: { repositories },
      } = await octokit.rest.apps.listReposAccessibleToInstallation();

      for (const repo of repositories) {
        let changelog;

        try {
          changelog = (
            await octokit.rest.repos.getContent({
              owner: repo.owner.login,
              repo: repo.name,
              path: "CHANGELOG.md",
            })
          ).data;
        } catch (_) {
          // Skip repos without CHANGELOG.md
          continue;
        }

        if (!Array.isArray(changelog) && changelog.type === "file") {
          const decoded = Buffer.from(changelog.content, "base64").toString();
          const parsed = parser(decoded);

          await database.transaction(async (tx) => {
            const saved = await tx
              .insert(changelogs)
              .values({
                userId: user.id,
                installationId: installed[0].id,
                repositoryId: repo.id,
                owner: repo.owner.login,
                name: repo.name,
                raw: decoded,
              })
              .returning();

            for (const version of parsed.releases) {
              if (!version.version) continue;

              await tx.insert(versions).values({
                userId: user.id,
                changelogId: saved[0].id,
                version: version.version,
                releaseDate: version.date,
                content: version.toString(),
              });
            }
          });
        }
      }
    }

    return NextResponse.redirect(new URL("/dash", request.url));
  } catch (error) {
    console.error("GitHub installation callback error:", error);

    return createErrorResponse("Installation failed", 500);
  }
}
