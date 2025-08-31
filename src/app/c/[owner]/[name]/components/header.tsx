"use client";

import { Button } from "@/components/ui/button";
import Versions from "./versions";
import { Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { versions } from "@/database/schema";
import { InferSelectModel } from "drizzle-orm";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

type Props = {
  owner: string;
  name: string;
  version: InferSelectModel<typeof versions>;
};

export default function Header({ owner, name, version }: Props) {
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
    </div>
  );
}
