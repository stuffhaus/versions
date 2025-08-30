import Markdown from "react-markdown";
import { database } from "@/lib/database";
import { changelogs, versions } from "@/database/schema";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Header from "../components/header";

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
    <div>
      <h1 className="text-4xl mb-4">
        <span className="font-bold ">{owner}</span>/{name}/{version}
      </h1>

      <Header owner={owner} name={name} version={foundVersion} />

      <div className="prose max-w-none">
        <Markdown>{foundVersion.content}</Markdown>
      </div>
    </div>
  );
}
