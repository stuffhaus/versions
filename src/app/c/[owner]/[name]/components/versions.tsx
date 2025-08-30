"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InferSelectModel } from "drizzle-orm";
import { versions } from "@/database/schema";

interface VersionsResponse {
  versions: InferSelectModel<typeof versions>[];
}

interface Props {
  owner: string;
  name: string;
  initialValue: string;
  onVersionSelect?: (versionId: string) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Component({
  owner,
  name,
  initialValue,
  onVersionSelect,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(initialValue);
  const router = useRouter();

  const { data, error, isLoading } = useSWR<VersionsResponse>(
    `/api/changelogs/${owner}/${name}/versions`,
    fetcher,
  );

  const versions = data?.versions || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            {value
              ? versions.find((version) => version.version === value)?.version
              : isLoading
                ? "Loading..."
                : "Select version..."}
            {value && versions[0]?.version === value && (
              <Badge variant="default" className="text-xs">
                Latest
              </Badge>
            )}
          </div>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search version..." />

          <CommandList>
            <CommandEmpty>
              {error ? "Failed to load versions." : "No versions found."}
            </CommandEmpty>

            <CommandGroup>
              {versions.map((version, index) => (
                <CommandItem
                  key={version.id}
                  value={version.version}
                  onSelect={() => {
                    const newValue = version.version;

                    setValue(newValue);
                    setOpen(false);

                    // Navigate to the version URL
                    router.push(`/c/${owner}/${name}/${newValue}`);

                    if (onVersionSelect && newValue) {
                      onVersionSelect(newValue);
                    }
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === version.version ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span>{version.version}</span>

                      {version.releaseDate && (
                        <span className="text-xs text-gray-500">
                          {new Date(version.releaseDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {index === 0 && (
                      <Badge variant="default" className="text-xs ml-2">
                        Latest
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
