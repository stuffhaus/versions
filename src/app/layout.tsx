import type { Metadata } from "next";
import { StackProvider, StackTheme, UserButton } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Versions",
  description: "The simplest changelog app for makers.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await stackServerApp.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <div className="flex flex-col w-2xl m-auto my-8">
              <header className="flex justify-between items-center w-full p-4">
                <div className="flex flex-row gap-2">
                  <Link className="font-mono font-bold" href="/">
                    Versions
                  </Link>

                  {user && (
                    <>
                      <span className="text-gray-500">·</span>

                      <Link href="/dash" className="hover:underline">
                        Dashboard
                      </Link>
                    </>
                  )}
                </div>

                {user && <UserButton />}
              </header>

              <div className="p-4">{children}</div>

              <footer className="flex justify-center items-center w-full p-4 mt-16">
                <Link href="https://www.stuffhaus.dev" target="_blank">
                  <Image
                    src="/watermark.svg"
                    alt="Watermark"
                    width={32}
                    height={32}
                  />
                </Link>
              </footer>
            </div>
          </StackTheme>
        </StackProvider>

        <Toaster position="top-center" />
      </body>
    </html>
  );
}
