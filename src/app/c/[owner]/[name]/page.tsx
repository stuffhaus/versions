import Markdown from "react-markdown";
import { database } from "@/lib/database";
import { changelogs, versions } from "@/database/schema";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Header from "./components/header";
import Reactions from "./components/reactions";
import Head from "next/head";

interface PageProps {
  params: Promise<{
    owner: string;
    name: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { owner, name } = await params;

  const changelog = await database
    .select()
    .from(changelogs)
    .where(and(eq(changelogs.owner, owner), eq(changelogs.name, name)))
    .limit(1);

  if (changelog.length === 0) {
    notFound();
  }

  const latestVersion = await database
    .select()
    .from(versions)
    .where(and(eq(versions.changelogId, changelog[0].id)))
    .orderBy(desc(versions.createdAt))
    .limit(1);

  if (latestVersion.length === 0) {
    notFound();
  }

  const version = latestVersion[0];

  return (
    <>
      <Head>
        <meta
          property="og:image"
          content={`/api/og?owner=${owner}&name=${name}&version=${version.version}`}
        />
      </Head>

      <div>
        <h1 className="text-4xl mb-4">
          {owner}/<span className="font-bold ">{name}</span>
        </h1>

        <Header
          owner={owner}
          name={name}
          changelog={changelog[0]}
          version={version}
        />

        <div className="prose max-w-none">
          <Markdown>{version.content as string}</Markdown>
        </div>

        <Reactions
          versionId={version.id}
          initialReactions={version.reactions || {}}
        />
      </div>
    </>
  );
}
