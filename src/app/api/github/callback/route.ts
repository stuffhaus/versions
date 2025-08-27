import { database } from "@/lib/database";
import { stackServerApp } from "@/stack";
import { NextRequest, NextResponse } from "next/server";
import { installations } from "../../../../../database/schema";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const installationId = searchParams.get("installation_id");
    const setupAction = searchParams.get("setup_action");

    if (!installationId) {
      console.error("No installation ID found in URL");

      return NextResponse.json(
        { error: "No installation ID found" },
        { status: 400 },
      );
    }

    if (setupAction === "install") {
      await database.insert(installations).values({
        installationId,
        userId: user.id,
      });
    }

    return NextResponse.redirect(new URL("/dash", request.url));
  } catch (error) {
    console.error("GitHub installation callback error:", error);

    return NextResponse.json({ error: "Installation failed" }, { status: 500 });
  }
}
