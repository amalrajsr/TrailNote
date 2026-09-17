import type { Metadata } from "next";
import { Commissioner } from "next/font/google";
import "./globals.css";
import { Header } from "../src/components/shell/header";
import { Footer } from "../src/components/shell/footer";
import { LogoutProvider } from "../src/components/auth/logout-provider";
import { env } from "../src/server/env";
export const dynamic = "force-dynamic";

const commissioner = Commissioner({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-commissioner",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "TrailNote",
    template: "%s · TrailNote",
  },
  description: "Tell the next traveller what you wish someone had told you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${commissioner.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LogoutProvider>
          <Header />
          {children}
          <Footer />
        </LogoutProvider>
      </body>
    </html>
  );
}
