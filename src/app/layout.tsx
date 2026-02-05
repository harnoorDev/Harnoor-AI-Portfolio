import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Harnoor Singh | AI Engineer",
  description: "Cloud & AI Engineer specializing in designing and deploying secure, production-grade AI systems.",
  keywords: ["AI Engineer", "Cloud Engineer", "LLM Security", "Machine Learning", "Toronto"],
  authors: [{ name: "Harnoor Singh" }],
  openGraph: {
    title: "Harnoor Singh | AI Engineer",
    description: "Cloud & AI Engineer specializing in secure, production-grade AI systems.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
