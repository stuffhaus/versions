import { ImageResponse } from "next/og";
import { database } from "@/lib/database";
import { changelogs, versions } from "@/database/schema";
import { and, eq } from "drizzle-orm";

async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/,
  );

  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status == 200) {
      return await response.arrayBuffer();
    }
  }

  throw new Error("failed to load font data");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const owner = searchParams.get("owner");
    const name = searchParams.get("name");
    const version = searchParams.get("version");

    if (!owner || !name || !version) {
      return new Response("Missing parameters", { status: 400 });
    }

    // Fetch changelog and version data
    const changelog = await database
      .select()
      .from(changelogs)
      .where(and(eq(changelogs.owner, owner), eq(changelogs.name, name)))
      .limit(1);

    if (changelog.length === 0) {
      return new Response("Changelog not found", { status: 404 });
    }

    const versionData = await database
      .select()
      .from(versions)
      .where(
        and(
          eq(versions.changelogId, changelog[0].id),
          eq(versions.version, version),
        ),
      )
      .limit(1);

    if (versionData.length === 0) {
      return new Response("Version not found", { status: 404 });
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffffff",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              color: "#666666",
            }}
          >
            {owner}
          </div>

          <div
            style={{
              fontSize: "48px",
              color: "#000000",
            }}
          >
            {name}
          </div>

          <div
            style={{
              fontSize: "64px",
              color: "#000000",
              fontWeight: "bolder",
            }}
          >
            {version}
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="35"
            height="30"
            aria-hidden="true"
            style={{
              marginTop: "32px",
            }}
          >
            <g fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 10v100M60 10v100M100 10v100M10 30h120M10 70h120M20 30l40 40M60 30l40 40M100 30l30 40" />
            </g>
          </svg>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Geist",
            data: await loadGoogleFont("Geist", owner),
            style: "normal",
          },
          {
            name: "Geist",
            data: await loadGoogleFont("Geist", name),
            style: "normal",
          },
          {
            name: "Geist",
            data: await loadGoogleFont("Geist", version),
            style: "normal",
          },
        ],
      },
    );
  } catch (error) {
    console.error("Error generating OG image:", error);

    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
