import type { Metadata } from "next";
import { StackProvider, StackTheme, UserButton } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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
            <div className="flex flex-col justify-between items-center w-lg m-auto my-8">
              <header className="flex justify-between items-center w-full p-4">
                <h1 className="font-mono">Versions</h1>

                <UserButton />
              </header>

              <div>{children}</div>
            </div>
          </StackTheme>
        </StackProvider>

        <Toaster position="top-center" />
      </body>
    </html>
  );
}
