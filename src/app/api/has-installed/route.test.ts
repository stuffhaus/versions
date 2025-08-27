import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { stackServerApp } from "@/stack";
import { database } from "@/lib/database";
import { NextRequest } from "next/server";
import { CurrentUser } from "@stackframe/stack";

const mockStackServerApp = vi.mocked(stackServerApp);
const mockDatabase = vi.mocked(database);

describe("/api/has-installed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when user has no installations", async () => {
    mockStackServerApp.getUser.mockResolvedValue({
      id: "user-123",
    } as CurrentUser);
    mockDatabase.$count.mockResolvedValue(0);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(data).toEqual({ hasInstalled: false });
    expect(mockDatabase.$count).toHaveBeenCalled();
  });

  it("returns true when user has installations", async () => {
    mockStackServerApp.getUser.mockResolvedValue({
      id: "user-123",
    } as CurrentUser);
    mockDatabase.$count.mockResolvedValue(1);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(data).toEqual({ hasInstalled: true });
    expect(mockDatabase.$count).toHaveBeenCalled();
  });

  it("handles database errors gracefully", async () => {
    mockStackServerApp.getUser.mockResolvedValue({
      id: "user-123",
    } as CurrentUser);
    mockDatabase.$count.mockRejectedValue(new Error("Database error"));

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to get installations" });
  });

  it("handles auth errors gracefully", async () => {
    mockStackServerApp.getUser.mockRejectedValue(new Error("Auth error"));

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to get installations" });
  });
});
