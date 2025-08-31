import { NextRequest } from "next/server";
import { database } from "@/lib/database";
import { versions } from "@/database/schema";
import { eq } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-types";
import emojiRegex from "emoji-regex";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { reaction } = await request.json();

    // Validate reaction is a string and not empty
    if (!reaction || typeof reaction !== "string" || reaction.trim() === "") {
      return createErrorResponse("Invalid reaction type", 400);
    }

    // Validate reaction is a single emoji
    const cleanReaction = reaction.trim();
    const regex = emojiRegex();
    const matches = cleanReaction.match(regex);
    
    if (!matches || matches.length !== 1 || matches[0] !== cleanReaction) {
      return createErrorResponse("Invalid reaction format", 400);
    }

    // Get current version
    const currentVersion = await database
      .select({ reactions: versions.reactions })
      .from(versions)
      .where(eq(versions.id, id))
      .limit(1);

    if (currentVersion.length === 0) {
      return createErrorResponse("Version not found", 404);
    }

    // Update reactions count
    const currentReactions =
      (currentVersion[0].reactions as Record<string, number>) || {};
    const updatedReactions = {
      ...currentReactions,
      [cleanReaction]: (currentReactions[cleanReaction] || 0) + 1,
    };

    // Update the version
    await database
      .update(versions)
      .set({ reactions: updatedReactions })
      .where(eq(versions.id, id));

    return createSuccessResponse({ reactions: updatedReactions });
  } catch (error) {
    console.error("Error updating reaction:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
