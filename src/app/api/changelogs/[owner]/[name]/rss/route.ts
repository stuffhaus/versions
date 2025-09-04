import { database } from "@/lib/database";
import { changelogs, versions } from "@/database/schema";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

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

    const rssItems = changelogVersions
      .map((version) => {
        const versionUrl = `${baseUrl}/c/${owner}/${name}/${version.version}`;
        const pubDate = version.releaseDate || version.createdAt;

        return `
    <item>
      <title>${name} v${version.version}</title>
      <link>${versionUrl}</link>
      <guid>${versionUrl}</guid>
      <description><![CDATA[${version.content}]]></description>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
    </item>`;
      })
      .join("");

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${owner}/${name} Changelog</title>
    <link>${changelogUrl}</link>
    <description>${changelog[0].description || `Changelog for ${owner}/${name}`}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/changelogs/${owner}/${name}/rss" rel="self" type="application/rss+xml"/>
    <generator>Versions App - https://github.com/stuffhaus/versions</generator>${rssItems}
  </channel>
</rss>`;

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
