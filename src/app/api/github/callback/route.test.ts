import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { stackServerApp } from "@/stack";
import { database } from "@/lib/database";
import { installations } from "@/database/schema";
import { NextRequest } from "next/server";
import { CurrentUser } from "@stackframe/stack";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

const mockStackServerApp = vi.mocked(stackServerApp);

vi.mock("@/lib/github", () => ({
  createGitHubClient: vi.fn(() => ({
    rest: {
      apps: { listReposAccessibleToInstallation: vi.fn().mockResolvedValue({ data: { repositories: [] }}) },
      repos: { getContent: vi.fn().mockRejectedValue(new Error("No changelog")) }
    }
  }))
}));

vi.mock("keep-a-changelog", () => ({ parser: vi.fn(() => ({ releases: [] })) }));

const createMockRequest = (url: string): NextRequest => {
  return {
    url,
    nextUrl: new URL(url),
  } as NextRequest;
};

describe("/api/github/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockStackServerApp.getUser.mockResolvedValue(null);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=123&setup_action=install",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when installation_id is missing", async () => {
    mockStackServerApp.getUser.mockResolvedValue({
      id: "user-123",
    } as CurrentUser);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?setup_action=install",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "No installation ID found" });
  });

  it("creates installation record when setup_action is install", async () => {
    mockStackServerApp.getUser.mockResolvedValue({ id: "user-123" } as CurrentUser);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=callback-create-12345&setup_action=install",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    
    const createdInstallation = await database
      .select()
      .from(installations)
      .where(eq(installations.installationId, "callback-create-12345"))
      .limit(1);
    
    expect(createdInstallation).toHaveLength(1);
    expect(createdInstallation[0].userId).toBe("user-123");
  });

  it("redirects to /dash after successful installation", async () => {
    mockStackServerApp.getUser.mockResolvedValue({ id: "user-123" } as CurrentUser);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=callback-redirect-12345&setup_action=install",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dash");
  });

  it("redirects to /dash without creating record when setup_action is not install", async () => {
    mockStackServerApp.getUser.mockResolvedValue({ id: "user-123" } as CurrentUser);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=callback-update-12345&setup_action=update",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dash");

    const createdInstallations = await database
      .select()
      .from(installations)
      .where(eq(installations.installationId, "callback-update-12345"))
      .limit(1);
    
    expect(createdInstallations).toHaveLength(0);
  });

  it("handles database errors gracefully", async () => {
    mockStackServerApp.getUser.mockResolvedValue({ id: "user-123" } as CurrentUser);
    
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=duplicate-error-test&setup_action=install",
    );

    await database.insert(installations).values({
      id: randomUUID(),
      userId: "user-123",
      installationId: "duplicate-error-test",
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    
    if (response.status === 500) {
      const data = await response.json();
      expect(data).toEqual({ error: "Installation failed" });
    }
  });

  it("handles auth errors gracefully", async () => {
    mockStackServerApp.getUser.mockRejectedValue(new Error("Auth error"));
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=12345&setup_action=install",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Installation failed" });
  });

  it("handles missing setup_action parameter", async () => {
    mockStackServerApp.getUser.mockResolvedValue({ id: "user-123" } as CurrentUser);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=callback-missing-12345",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dash");

    const createdInstallations = await database
      .select()
      .from(installations)
      .where(eq(installations.installationId, "callback-missing-12345"))
      .limit(1);
    
    expect(createdInstallations).toHaveLength(0);
  });
});
