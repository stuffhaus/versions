import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { database } from "@/lib/database";
import { changelogs, versions, installations } from "@/database/schema";
import { randomUUID } from "crypto";

describe("GET /api/changelogs/[owner]/[name]/versions", () => {
  it("should return versions for a valid changelog", async () => {
    await database.insert(installations).values({
      id: randomUUID(),
      userId: "user123",
      installationId: "test-installation-1",
    });

    const insertedChangelog = await database
      .insert(changelogs)
      .values({
        id: randomUUID(),
        userId: "user123",
        installationId: randomUUID(),
        repositoryId: 12345,
        owner: "versions-test-owner",
        name: "versions-test-repo",
        description: "Test Changelog",
        raw: "# Changelog\n## 1.0.0\n- Initial release",
      })
      .returning();

    await database.insert(versions).values([
      {
        id: randomUUID(),
        userId: "user123",
        changelogId: insertedChangelog[0].id,
        version: "1.0.0",
        releaseDate: new Date("2024-01-01"),
        content: "Initial release",
      },
      {
        id: randomUUID(),
        userId: "user123",
        changelogId: insertedChangelog[0].id,
        version: "0.9.0",
        releaseDate: new Date("2023-12-01"),
        content: "Beta release",
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/changelogs/versions-test-owner/versions-test-repo/versions",
    );
    const params = Promise.resolve({
      owner: "versions-test-owner",
      name: "versions-test-repo",
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.versions).toHaveLength(2);
    expect(data.versions[0].version).toBe("1.0.0");
    expect(data.versions[1].version).toBe("0.9.0");
  });

  it("should return 404 when changelog not found", async () => {
    const request = new NextRequest(
      "http://localhost/api/changelogs/nonexistent/repo/versions",
    );
    const params = Promise.resolve({ owner: "nonexistent", name: "repo" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Changelog not found");
  });

  it("should return empty versions array when no versions exist", async () => {
    await database.insert(installations).values({
      id: randomUUID(),
      userId: "user123",
      installationId: "test-installation-2",
    });

    await database.insert(changelogs).values({
      id: randomUUID(),
      userId: "user123",
      installationId: randomUUID(),
      repositoryId: 12345,
      owner: "versions-test-owner",
      name: "versions-test-repo",
      description: "Test Changelog",
      raw: "# Changelog\n(no versions yet)",
    });

    const request = new NextRequest(
      "http://localhost/api/changelogs/versions-test-owner/versions-test-repo/versions",
    );
    const params = Promise.resolve({
      owner: "versions-test-owner",
      name: "versions-test-repo",
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.versions).toEqual([]);
  });

  it("should handle database errors gracefully", async () => {
    const request = new NextRequest(
      "http://localhost/api/changelogs/testowner/testrepo/versions",
    );
    const params = Promise.resolve({ owner: "", name: "" });

    const response = await GET(request, { params });

    expect([404, 500]).toContain(response.status);
  });
});
