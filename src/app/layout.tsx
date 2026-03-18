import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { FigmaPasteProvider } from "@/components/FigmaPasteProvider";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Haze",
  description: "Build real Tauri desktop application GUIs visually. Export production-ready source code. No mockups—real layout, real CSS, real components.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
        <AuthProvider>
          <FigmaPasteProvider>{children}</FigmaPasteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
