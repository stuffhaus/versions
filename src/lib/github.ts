import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

// Create GitHub client with App authentication for specific installation
export function createGitHubClient(installationId: string) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"), // Handle escaped newlines from env
      installationId: installationId,
    },
  });
}
