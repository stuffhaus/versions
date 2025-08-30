import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

export function createGitHubClient(installationId: string) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      installationId: installationId,
    },
  });
}
