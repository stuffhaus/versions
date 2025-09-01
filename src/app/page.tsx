import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <div>
      <p className="text-3xl mt-4">
        Keep your project updates clean and easy to share. Versions reads from
        changelogs that follow the{" "}
        <Link
          href="https://keepachangelog.com/en/1.0.0/"
          className="font-bold hover:underline"
        >
          Keep a Changelog
        </Link>{" "}
        format—no hacks, no guessing. Just clear history, version by version.
      </p>

      <p className="text-xl mt-8">
        Fast setup. Automatic sync. Built for sharing, not managing.
      </p>

      <Link
        href="/handler/sign-in?after_auth_return_to=/dash"
        className="inline-block mt-8"
      >
        <Button size="xl" className="text-lg">
          Get Started
        </Button>
      </Link>
    </div>
  );
}
