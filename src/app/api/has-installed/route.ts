import { database } from "@/lib/database";
import { stackServerApp } from "@/stack";
import { NextRequest, NextResponse } from "next/server";
import { installations } from "../../../../database/schema";
import { eq } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ or: "redirect" });
    const amount = await database.$count(
      installations,
      eq(installations.userId, user.id),
    );

    return NextResponse.json({ hasInstalled: amount > 0 });
  } catch (error) {
    console.error("Failed to get installations:", error);

    return NextResponse.json(
      { error: "Failed to get installations" },
      { status: 500 },
    );
  }
}
