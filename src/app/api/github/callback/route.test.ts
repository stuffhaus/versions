import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { stackServerApp } from "@/stack";
import { database } from "@/lib/database";
import { NextRequest } from "next/server";
import { CurrentUser } from "@stackframe/stack";

const mockStackServerApp = vi.mocked(stackServerApp);
const mockDatabase = vi.mocked(database);

const createMockRequest = (url: string): NextRequest => {
  return {
    url,
    nextUrl: new URL(url),
  } as NextRequest;
};

describe("/api/github/callback", () => {
  const mockValues = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockValues.mockResolvedValue(undefined);
    mockDatabase.insert = vi.fn().mockReturnValue({
      values: mockValues,
    });
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
    mockStackServerApp.getUser.mockResolvedValue({
      id: "user-123",
    } as CurrentUser);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=12345&setup_action=install",
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect status
    expect(mockDatabase.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      installationId: "12345",
      userId: "user-123",
    });
  });

  it("redirects to /dash after successful installation", async () => {
    mockStackServerApp.getUser.mockResolvedValue({
      id: "user-123",
    } as CurrentUser);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=12345&setup_action=install",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);

    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/dash");
  });

  it("redirects to /dash without creating record when setup_action is not install", async () => {
    mockStackServerApp.getUser.mockResolvedValue({
      id: "user-123",
    } as CurrentUser);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=12345&setup_action=update",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(mockDatabase.insert).not.toHaveBeenCalled();

    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/dash");
  });

  it("handles database errors gracefully", async () => {
    mockStackServerApp.getUser.mockResolvedValue({
      id: "user-123",
    } as CurrentUser);
    mockValues.mockRejectedValue(new Error("Database error"));
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=12345&setup_action=install",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Installation failed" });
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
    mockStackServerApp.getUser.mockResolvedValue({
      id: "user-123",
    } as CurrentUser);
    const request = createMockRequest(
      "http://localhost:3000/api/github/callback?installation_id=12345",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(mockDatabase.insert).not.toHaveBeenCalled();

    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/dash");
  });
});
