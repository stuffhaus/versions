import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { database } from "@/lib/database";
import { changelogs, versions, installations } from "@/database/schema";
import { randomUUID } from "crypto";

describe("POST /api/versions/[id]/reactions", () => {
  it("should add a reaction to a version", async () => {
    // Setup test data
    const installationId = randomUUID();
    await database.insert(installations).values({
      id: installationId,
      userId: "user123",
      installationId: "test-installation",
    });

    const changelogId = randomUUID();
    await database.insert(changelogs).values({
      id: changelogId,
      userId: "user123",
      installationId,
      repositoryId: 12345,
      owner: "test-owner",
      name: "test-repo",
      description: "Test Changelog",
      raw: "# Changelog\n## 1.0.0\n- Initial release",
    });

    const versionId = randomUUID();
    await database.insert(versions).values({
      id: versionId,
      userId: "user123",
      changelogId,
      version: "1.0.0",
      releaseDate: new Date("2024-01-01"),
      content: "Initial release",
      reactions: {},
    });

    // Make request
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: "👍" }),
      },
    );
    const params = Promise.resolve({ id: versionId });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reactions).toEqual({ "👍": 1 });
  });

  it("should increment existing reaction count", async () => {
    // Setup test data with existing reactions
    const installationId = randomUUID();
    await database.insert(installations).values({
      id: installationId,
      userId: "user123",
      installationId: "test-installation",
    });

    const changelogId = randomUUID();
    await database.insert(changelogs).values({
      id: changelogId,
      userId: "user123",
      installationId,
      repositoryId: 12345,
      owner: "test-owner",
      name: "test-repo",
      description: "Test Changelog",
      raw: "# Changelog\n## 1.0.0\n- Initial release",
    });

    const versionId = randomUUID();
    await database.insert(versions).values({
      id: versionId,
      userId: "user123",
      changelogId,
      version: "1.0.0",
      releaseDate: new Date("2024-01-01"),
      content: "Initial release",
      reactions: { "👍": 2, "❤️": 1 },
    });

    // Make request
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: "👍" }),
      },
    );
    const params = Promise.resolve({ id: versionId });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reactions).toEqual({ "👍": 3, "❤️": 1 });
  });

  it("should handle version with null reactions", async () => {
    // Setup test data
    const installationId = randomUUID();
    await database.insert(installations).values({
      id: installationId,
      userId: "user123",
      installationId: "test-installation",
    });

    const changelogId = randomUUID();
    await database.insert(changelogs).values({
      id: changelogId,
      userId: "user123",
      installationId,
      repositoryId: 12345,
      owner: "test-owner",
      name: "test-repo",
      description: "Test Changelog",
      raw: "# Changelog\n## 1.0.0\n- Initial release",
    });

    const versionId = randomUUID();
    await database.insert(versions).values({
      id: versionId,
      userId: "user123",
      changelogId,
      version: "1.0.0",
      releaseDate: new Date("2024-01-01"),
      content: "Initial release",
      reactions: null,
    });

    // Make request
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: "🎉" }),
      },
    );
    const params = Promise.resolve({ id: versionId });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reactions).toEqual({ "🎉": 1 });
  });

  it("should return 404 for non-existent version", async () => {
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: "👍" }),
      },
    );
    const params = Promise.resolve({ id: randomUUID() }); // Valid UUID format

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Version not found");
  });

  it("should return 400 for invalid reaction (empty string)", async () => {
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: "" }),
      },
    );
    const params = Promise.resolve({ id: "some-id" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid reaction type");
  });

  it("should return 400 for invalid reaction (null)", async () => {
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: null }),
      },
    );
    const params = Promise.resolve({ id: "some-id" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid reaction type");
  });

  it("should return 400 for invalid reaction (not a string)", async () => {
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: 123 }),
      },
    );
    const params = Promise.resolve({ id: "some-id" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid reaction type");
  });

  it("should return 400 for invalid reaction format (special chars)", async () => {
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: "<script>" }),
      },
    );
    const params = Promise.resolve({ id: "some-id" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid reaction format");
  });

  it("should accept valid emoji reactions", async () => {
    // Setup test data
    const installationId = randomUUID();
    await database.insert(installations).values({
      id: installationId,
      userId: "user123",
      installationId: "test-installation",
    });

    const changelogId = randomUUID();
    await database.insert(changelogs).values({
      id: changelogId,
      userId: "user123",
      installationId,
      repositoryId: 12345,
      owner: "test-owner",
      name: "test-repo",
      description: "Test Changelog",
      raw: "# Changelog\n## 1.0.0\n- Initial release",
    });

    const versionId = randomUUID();
    await database.insert(versions).values({
      id: versionId,
      userId: "user123",
      changelogId,
      version: "1.0.0",
      releaseDate: new Date("2024-01-01"),
      content: "Initial release",
      reactions: {},
    });

    const validReactions = ["👍", "❤️", "🎉", "🚀", "👎", "😂"];

    for (const emoji of validReactions) {
      const request = new NextRequest(
        "http://localhost/api/versions/123/reactions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction: emoji }),
        },
      );
      const params = Promise.resolve({ id: versionId });

      const response = await POST(request, { params });
      expect(response.status).toBe(200);
    }
  });

  it("should handle malformed JSON", async () => {
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      },
    );
    const params = Promise.resolve({ id: "some-id" });

    const response = await POST(request, { params });

    expect(response.status).toBe(500);
  });

  it("should trim whitespace from reactions", async () => {
    // Setup test data
    const installationId = randomUUID();
    await database.insert(installations).values({
      id: installationId,
      userId: "user123",
      installationId: "test-installation",
    });

    const changelogId = randomUUID();
    await database.insert(changelogs).values({
      id: changelogId,
      userId: "user123",
      installationId,
      repositoryId: 12345,
      owner: "test-owner",
      name: "test-repo",
      description: "Test Changelog",
      raw: "# Changelog\n## 1.0.0\n- Initial release",
    });

    const versionId = randomUUID();
    await database.insert(versions).values({
      id: versionId,
      userId: "user123",
      changelogId,
      version: "1.0.0",
      releaseDate: new Date("2024-01-01"),
      content: "Initial release",
      reactions: {},
    });

    // Make request with whitespace
    const request = new NextRequest(
      "http://localhost/api/versions/123/reactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: "  👍  " }),
      },
    );
    const params = Promise.resolve({ id: versionId });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reactions).toEqual({ "👍": 1 });
  });
});
