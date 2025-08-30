import { changelogs, installations } from "@/database/schema";
import { database } from "@/lib/database";
import { stackServerApp } from "@/stack";
import Install from "./components/install";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function Page() {
  const user = await stackServerApp.getUser({ or: "throw" });
  const installationCount = await database.$count(
    installations,
    eq(installations.userId, user.id),
  );

  const hasInstalled = installationCount > 0;

  if (!hasInstalled) {
    return <Install />;
  }

  const changes = await database
    .select()
    .from(changelogs)
    .where(eq(changelogs.userId, user.id));

  return (
    <div>
      <h1 className="text-4xl font-bold pb-6">CHANGELOGs</h1>

      <ul className="list-none">
        {changes.map((change) => (
          <li key={change.id}>
            <Link
              key={change.id}
              href={`/c/${change.owner}/${change.name}`}
              className=" px-4 py-2 hover:bg-amber-100"
            >
              <span className="font-bold">{change.owner}</span>/{change.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
