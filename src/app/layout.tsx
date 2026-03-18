import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Rubik } from "next/font/google";
import { FigmaPasteProvider } from "@/components/FigmaPasteProvider";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/contexts/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
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

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${rubik.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <FigmaPasteProvider>
              <ToastProvider>{children}</ToastProvider>
            </FigmaPasteProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
