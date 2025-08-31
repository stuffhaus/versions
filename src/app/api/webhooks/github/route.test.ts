import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { database } from "@/lib/database";
import { changelogs, versions, installations } from "@/database/schema";
import crypto, { randomUUID } from "crypto";
import * as githubModule from "@/lib/github";
import * as changelogModule from "keep-a-changelog";

vi.mock("@/lib/github", () => ({ createGitHubClient: vi.fn() }));
vi.mock("keep-a-changelog", () => ({ parser: vi.fn() }));

describe("POST /api/webhooks/github", () => {
  const validSignature = "sha256=valid-signature";
  const webhookSecret = "test-webhook-secret";

  const mockPushPayload = {
    installation: { id: 123 },
    repository: {
      id: 999456,
      name: "webhook-test-repo",
      owner: { login: "webhook-test-owner" },
    },
    head_commit: {
      id: "abc123",
      message: "Update changelog",
      added: [],
      removed: [],
      modified: ["CHANGELOG.md"],
    },
  };

  const mockOctokit = {
    rest: {
      repos: {
        getContent: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_WEBHOOK_SECRET = webhookSecret;
    vi.spyOn(crypto, "createHmac").mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue("valid-signature"),
    } as unknown as crypto.Hmac);
    vi.spyOn(crypto, "timingSafeEqual").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("should process webhook successfully with new versions", async () => {
    await database.insert(installations).values({
      id: randomUUID(),
      userId: "user123",
      installationId: "webhook-success-123",
    });

    await database.insert(changelogs).values({
      id: randomUUID(),
      userId: "user123",
      installationId: randomUUID(),
      repositoryId: 999456,
      owner: "webhook-test-owner",
      name: "webhook-test-repo",
      description: "Test Changelog",
      raw: "# Changelog\n## 1.0.0\n- Initial release",
    });

    vi.mocked(githubModule.createGitHubClient).mockReturnValue(
      mockOctokit as unknown as ReturnType<
        typeof githubModule.createGitHubClient
      >,
    );
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: {
        type: "file",
        content: Buffer.from(
          "# Changelog\n## [1.1.0] - 2024-01-01\n- New feature",
        ).toString("base64"),
      },
    });

    vi.mocked(changelogModule.parser).mockReturnValue({
      releases: [
        {
          version: "1.1.0",
          date: new Date("2024-01-01"),
          toString: () => "## [1.1.0] - 2024-01-01\n- New feature",
        },
      ],
    } as ReturnType<typeof changelogModule.parser>);

    const body = JSON.stringify(mockPushPayload);
    const request = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256": validSignature,
        "x-github-event": "push",
        "content-type": "application/json",
      },
      body,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Webhook processed successfully");
    expect(data.newVersions).toBe(1);
    expect(githubModule.createGitHubClient).toHaveBeenCalledWith("123");
    expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
      owner: "webhook-test-owner",
      repo: "webhook-test-repo",
      path: "CHANGELOG.md",
    });
  });

  it("should reject invalid signature", async () => {
    vi.spyOn(crypto, "timingSafeEqual").mockReturnValue(false);

    const body = JSON.stringify(mockPushPayload);
    const request = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256": "sha256=invalid-signature",
        "x-github-event": "push",
      },
      body,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid signature");
  });

  it("should ignore non-push events", async () => {
    const body = JSON.stringify(mockPushPayload);
    const request = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256": validSignature,
        "x-github-event": "pull_request",
      },
      body,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Event ignored");
  });

  it("should ignore pushes without changelog changes", async () => {
    const payloadWithoutChangelog = {
      ...mockPushPayload,
      head_commit: {
        ...mockPushPayload.head_commit,
        modified: ["README.md"],
      },
    };

    const body = JSON.stringify(payloadWithoutChangelog);
    const request = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256": validSignature,
        "x-github-event": "push",
      },
      body,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("No changelog changes detected");
  });

  it("should return 404 when changelog not found in database", async () => {
    const body = JSON.stringify(mockPushPayload);
    const request = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256": validSignature,
        "x-github-event": "push",
      },
      body,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Changelog not found in database");
  });

  it("should handle GitHub API errors", async () => {
    await database.insert(installations).values({
      id: randomUUID(),
      userId: "user123",
      installationId: "webhook-api-error-123",
    });

    await database.insert(changelogs).values({
      id: randomUUID(),
      userId: "user123",
      installationId: randomUUID(),
      repositoryId: 999456,
      owner: "webhook-test-owner",
      name: "webhook-test-repo",
      description: "Test Changelog",
      raw: "# Changelog\n## 1.0.0\n- Initial release",
    });

    vi.mocked(githubModule.createGitHubClient).mockReturnValue(
      mockOctokit as unknown as ReturnType<
        typeof githubModule.createGitHubClient
      >,
    );

    mockOctokit.rest.repos.getContent.mockRejectedValue(new Error("API Error"));

    const body = JSON.stringify(mockPushPayload);
    const request = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256": validSignature,
        "x-github-event": "push",
      },
      body,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch changelog content");
  });

  it("should return 401 when no signature provided", async () => {
    const body = JSON.stringify(mockPushPayload);
    const request = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-github-event": "push",
      },
      body,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("No signature provided");
  });

  it("should return 500 when webhook secret not configured", async () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;

    const body = JSON.stringify(mockPushPayload);
    const request = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256": validSignature,
        "x-github-event": "push",
      },
      body,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Webhook secret not configured");
  });

  it("should skip duplicate versions", async () => {
    await database.insert(installations).values({
      id: randomUUID(),
      userId: "user123",
      installationId: "webhook-duplicate-123",
    });

    const insertedChangelog = await database
      .insert(changelogs)
      .values({
        id: randomUUID(),
        userId: "user123",
        installationId: randomUUID(),
        repositoryId: 999456,
        owner: "webhook-test-owner",
        name: "webhook-test-repo",
        description: "Test Changelog",
        raw: "# Changelog\n## 1.0.0\n- Initial release",
      })
      .returning();

    await database.insert(versions).values({
      id: randomUUID(),
      userId: "user123",
      changelogId: insertedChangelog[0].id,
      version: "1.0.0",
      releaseDate: new Date("2024-01-01"),
      content: "Initial release",
    });

    vi.mocked(githubModule.createGitHubClient).mockReturnValue(
      mockOctokit as unknown as ReturnType<
        typeof githubModule.createGitHubClient
      >,
    );
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: {
        type: "file",
        content: Buffer.from(
          "# Changelog\n## [1.0.0] - 2024-01-01\n- Initial release",
        ).toString("base64"),
      },
    });

    vi.mocked(changelogModule.parser).mockReturnValue({
      releases: [
        {
          version: "1.0.0",
          date: new Date("2024-01-01"),
          toString: () => "## [1.0.0] - 2024-01-01\n- Initial release",
        },
      ],
    } as ReturnType<typeof changelogModule.parser>);

    const body = JSON.stringify(mockPushPayload);
    const request = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256": validSignature,
        "x-github-event": "push",
      },
      body,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.newVersions).toBe(0);
  });
});
