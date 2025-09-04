import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { database } from "@/lib/database";
import { changelogs, versions, installations } from "@/database/schema";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

describe("RSS Feed API", () => {
  it("should generate RSS feed for changelog versions", async () => {
    await database.insert(installations).values({
      id: randomUUID(),
      userId: "user123",
      installationId: "test-installation-rss-1",
    });

    const insertedChangelog = await database
      .insert(changelogs)
      .values({
        id: randomUUID(),
        userId: "user123",
        installationId: randomUUID(),
        repositoryId: 12345,
        owner: "rss-test-owner",
        name: "rss-test-repo",
        description: "RSS Test Changelog",
        raw: "# Changelog\n## 1.2.0\n- New features\n## 1.1.0\n- Bug fixes",
      })
      .returning();

    await database.insert(versions).values([
      {
        id: randomUUID(),
        userId: "user123",
        changelogId: insertedChangelog[0].id,
        version: "1.2.0",
        releaseDate: new Date("2024-01-15"),
        content: "New features and improvements",
      },
      {
        id: randomUUID(),
        userId: "user123",
        changelogId: insertedChangelog[0].id,
        version: "1.1.0",
        releaseDate: new Date("2024-01-01"),
        content: "Bug fixes and stability improvements",
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/changelogs/rss-test-owner/rss-test-repo/rss",
    );
    const params = Promise.resolve({
      owner: "rss-test-owner",
      name: "rss-test-repo",
    });

    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/rss+xml; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");

    const rssContent = await response.text();

    expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(rssContent).toContain(
      "<title>rss-test-owner/rss-test-repo Changelog</title>",
    );
    expect(rssContent).toContain(
      "<description>RSS Test Changelog</description>",
    );
    expect(rssContent).toContain("<title>rss-test-repo v1.2.0</title>");
    expect(rssContent).toContain("<title>rss-test-repo v1.1.0</title>");
    expect(rssContent).toContain("New features and improvements");
    expect(rssContent).toContain("Bug fixes and stability improvements");
    expect(rssContent).toContain(
      "http://localhost/c/rss-test-owner/rss-test-repo/1.2.0",
    );
    expect(rssContent).toContain(
      "Versions App - https://github.com/stuffhaus/versions",
    );
  });

  it("should return 404 when changelog not found", async () => {
    const request = new NextRequest(
      "http://localhost/api/changelogs/nonexistent/repo/rss",
    );
    const params = Promise.resolve({ owner: "nonexistent", name: "repo" });

    const response = await GET(request, { params });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Changelog not found");
  });
});
