import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../src/components/shell/header";
import { Footer } from "../src/components/shell/footer";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "TrailNote",
    template: "%s · TrailNote",
  },
  description: "Tell the next traveller what you wish someone had told you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
