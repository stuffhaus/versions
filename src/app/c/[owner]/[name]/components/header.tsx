"use client";

import { Button } from "@/components/ui/button";
import Versions from "./versions";
import { Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { versions } from "@/database/schema";
import { InferSelectModel } from "drizzle-orm";
import { toast } from "sonner";

type Props = {
  owner: string;
  name: string;
  version: InferSelectModel<typeof versions>;
};

export default function Header({ owner, name, version }: Props) {
  return (
    <div className="flex justify-between items-center my-8">
      <div className="flex items-center gap-4">
        <Versions owner={owner} name={name} initialValue={version.version} />

        {version.releaseDate && (
          <p className="text-gray-500 text-sm">
            Released {new Date(version.releaseDate).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            copyToClipboard(
              `${window.location.origin}/c/${owner}/${name}/${version.version}`,
            );

            toast("Latest version copied to clipboard");
          }}
        >
          <Copy className="mr-2" />
          Copy
        </Button>

        <Button
          variant="link"
          size="sm"
          onClick={() => {
            copyToClipboard(`${window.location.origin}/c/${owner}/${name}`);

            toast("Latest version copied to clipboard");
          }}
        >
          Copy Latest
        </Button>
      </div>
    </div>
  );
}
