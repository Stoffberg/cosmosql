import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import {
  JetBrains_Mono,
  Martian_Mono,
  Schibsted_Grotesk,
} from "next/font/google";
import "./global.css";

const displayFont = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-martian",
});

const bodyFont = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});

const codeFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const description =
  "Type-safe, zero-dependency TypeScript client for Azure Cosmos DB. Partition keys are enforced at compile time, so expensive queries never reach production.";

export const metadata: Metadata = {
  metadataBase: new URL("https://cosmosql.dev"),
  title: {
    default: "CosmosQL: type-safe Azure Cosmos DB for TypeScript",
    template: "%s | CosmosQL",
  },
  description,
  openGraph: {
    siteName: "CosmosQL",
    type: "website",
    description,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  const fontVariables = [
    displayFont.variable,
    bodyFont.variable,
    codeFont.variable,
  ].join(" ");

  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
