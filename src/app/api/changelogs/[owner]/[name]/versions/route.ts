import { database } from "@/lib/database";
import { changelogs, versions } from "@/database/schema";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  type VersionsListResponse,
} from "@/lib/api-types";

interface RouteParams {
  params: Promise<{
    owner: string;
    name: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { owner, name } = await params;

    const changelog = await database
      .select()
      .from(changelogs)
      .where(and(eq(changelogs.owner, owner), eq(changelogs.name, name)))
      .limit(1);

    if (changelog.length === 0) {
      return createErrorResponse("Changelog not found", 404);
    }

    const changelogVersions = await database
      .select()
      .from(versions)
      .where(and(eq(versions.changelogId, changelog[0].id)))
      .orderBy(desc(versions.createdAt));

    const response: VersionsListResponse = { versions: changelogVersions };

    return createSuccessResponse(response);
  } catch (error) {
    console.error("Failed to get versions:", error);

    return createErrorResponse("Failed to get versions", 500);
  }
}
