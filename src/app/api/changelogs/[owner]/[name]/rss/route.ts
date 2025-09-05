import { database } from "@/lib/database";
import { changelogs, versions } from "@/database/schema";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import RSS from "rss";
import { marked } from "marked";

interface RouteParams {
  params: Promise<{
    owner: string;
    name: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { owner, name } = await params;

    const changelog = await database
      .select()
      .from(changelogs)
      .where(and(eq(changelogs.owner, owner), eq(changelogs.name, name)))
      .limit(1);

    if (changelog.length === 0) {
      return new Response("Changelog not found", { status: 404 });
    }

    const changelogVersions = await database
      .select()
      .from(versions)
      .where(and(eq(versions.changelogId, changelog[0].id)))
      .orderBy(desc(versions.releaseDate), desc(versions.createdAt))
      .limit(50); // Limit to latest 50 versions

    const baseUrl = new URL(request.url).origin;
    const changelogUrl = `${baseUrl}/c/${owner}/${name}`;

    const feed = new RSS({
      title: `${owner}/${name} Changelog`,
      description: changelog[0].description || `Changelog for ${owner}/${name}`,
      feed_url: `${baseUrl}/api/changelogs/${owner}/${name}/rss`,
      site_url: changelogUrl,
      language: "en",
      generator: "Versions App - https://github.com/stuffhaus/versions",
    });

    for (const version of changelogVersions) {
      const versionUrl = `${baseUrl}/c/${owner}/${name}/${version.version}`;
      const pubDate = version.releaseDate || version.createdAt;

      feed.item({
        title: `${name} v${version.version}`,
        description: await marked(version.content),
        url: versionUrl,
        guid: versionUrl,
        date: new Date(pubDate),
      });
    }

    const rssXml = feed.xml({ indent: true });

    return new Response(rssXml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Failed to generate RSS feed:", error);

    return new Response("Failed to generate RSS feed", { status: 500 });
  }
}
