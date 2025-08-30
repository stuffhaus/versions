import type { Metadata } from "next";
import { StackProvider, StackTheme, UserButton } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                  <h1 className="font-mono font-bold">Versions</h1>

                  <span className="text-gray-500">·</span>

                  {stackServerApp.getUser().then(
                    (user) =>
                      user && (
                        <Link href="/dash" className="hover:underline">
                          Dashboard
                        </Link>
                      ),
                  )}
                </div>

                <UserButton />
              </header>

              <div className="p-4">{children}</div>
            </div>
          </StackTheme>
        </StackProvider>

        <Toaster position="top-center" />
      </body>
    </html>
  );
}
