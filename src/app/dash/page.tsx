"use client";

import useSWR from "swr";
import Install from "./components/install";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Page() {
  useUser({ or: "redirect" });

  const { data, error, isLoading } = useSWR<{ hasInstalled: boolean }>(
    "/api/has-installed",
    fetcher,
  );

  if (isLoading) return;

  if (error) {
    console.error(error);

    toast("There was an error fetching the installation status.");

    return;
  }

  if (!data?.hasInstalled) {
    return <Install />;
  }

  return <></>;
}
