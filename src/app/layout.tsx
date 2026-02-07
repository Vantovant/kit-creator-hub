import type { Metadata } from "next";
import "./globals.css";
import ClientBody from "./ClientBody";

export const metadata: Metadata = {
  title: "Kit: Automated Email Marketing & Newsletter Platform",
  description:
    "Kit is the creator-first email marketing and newsletter platform. Grow your audience, automate campaigns, and sell without burnout.",
  icons: {
    icon: "https://ext.same-assets.com/6076700/3306272592.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <ClientBody>{children}</ClientBody>
    </html>
  );
}
