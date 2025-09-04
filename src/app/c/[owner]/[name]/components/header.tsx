"use client";

import { Button } from "@/components/ui/button";
import Versions from "./versions";
import { Copy, Rss } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { changelogs, versions } from "@/database/schema";
import { InferSelectModel } from "drizzle-orm";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import Markdown from "react-markdown";

type Props = {
  owner: string;
  name: string;
  changelog: InferSelectModel<typeof changelogs>;
  version: InferSelectModel<typeof versions>;
};

export default function Header({ owner, name, changelog, version }: Props) {
  return (
    <div>
      <div className="flex justify-between items-center my-8">
        <div className="flex items-center gap-4">
          <Versions owner={owner} name={name} initialValue={version.version} />

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              copyToClipboard(
                `${window.location.origin}/c/${owner}/${name}/${version.version}`,
              );

              toast(`Version ${version.version} copied to clipboard`);
            }}
          >
            <Copy className="mr-1" />
            Copy
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open(`/api/changelogs/${owner}/${name}/rss`, '_blank');
            }}
          >
            <Rss className="mr-1" />
            RSS
          </Button>
        </div>

        <div className="flex items-center">
          {version.releaseDate && (
            <p className="text-sm">
              <span className="text-gray-500">Released</span>{" "}
              {new Date(version.releaseDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-2xl uppercase font-black">✍️ Changelog</h2>
        <Separator className="flex-1" />
      </div>

      <div className="prose max-w-none mb-4">
        <Markdown>{changelog.description}</Markdown>
      </div>
    </div>
  );
}
