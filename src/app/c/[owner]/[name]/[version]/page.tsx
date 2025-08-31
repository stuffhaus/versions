import Markdown from "react-markdown";
import { database } from "@/lib/database";
import { changelogs, versions } from "@/database/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Header from "../components/header";
import Reactions from "../components/reactions";
import Head from "next/head";

interface PageProps {
  params: Promise<{
    owner: string;
    name: string;
    version: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { owner, name, version } = await params;

  const changelog = await database
    .select()
    .from(changelogs)
    .where(and(eq(changelogs.owner, owner), eq(changelogs.name, name)))
    .limit(1);

  if (changelog.length === 0) {
    notFound();
  }

  const found = await database
    .select()
    .from(versions)
    .where(
      and(
        eq(versions.changelogId, changelog[0].id),
        eq(versions.version, version),
      ),
    )
    .limit(1);

  if (found.length === 0) {
    notFound();
  }

  const foundVersion = found[0];

  return (
    <>
      <Head>
        <meta
          property="og:image"
          content={`/api/og?owner=${owner}&name=${name}&version=${version}`}
        />
      </Head>

      <div>
        <h1 className="text-4xl mb-4">
          {owner}/{name}/<span className="font-bold ">{version}</span>
        </h1>

        <Header
          owner={owner}
          name={name}
          changelog={changelog[0]}
          version={foundVersion}
        />

        <div className="prose max-w-none">
          <Markdown>{foundVersion.content as string}</Markdown>
        </div>

        <Reactions
          versionId={foundVersion.id}
          initialReactions={foundVersion.reactions || {}}
        />
      </div>
    </>
  );
}
