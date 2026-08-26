import type { Metadata, Viewport } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://miras.erenson.dev"),
  title: "Miras - Privacy-first family tree builder",
  description: "Build, organize and export interactive family trees in a fast, private and local-first workspace.",
  applicationName: "Miras",
  keywords: ["family tree", "family tree builder", "genealogy", "soy ağacı", "soy ağacı oluşturma"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Miras",
    title: "Miras - Privacy-first family tree builder",
    description: "Create interactive family trees that stay on your device.",
  },
  twitter: { card: "summary", title: "Miras", description: "Privacy-first, local-first family tree builder." },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f4f2ed" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Miras",
          url: "https://miras.erenson.dev",
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Any",
          isAccessibleForFree: true,
          description: "A privacy-first, local-first interactive family tree builder.",
          author: { "@type": "Person", name: "Erenson" },
        }) }} />
      </body>
    </html>
  );
}
