import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Literata } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Literata({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://deutschai.nimadevops.de"),
  title: { default: "deutschAI: Verben, die man sieht", template: "%s · deutschAI" },
  description: "Deutsche B2-Verben mit Fotos, kurzen Videos und Beispielsätzen lernen.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ebe6" },
    { media: "(prefers-color-scheme: dark)", color: "#171c22" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${serif.variable}`}>
      <body suppressHydrationWarning>
        <a className="skip" href="#entdecken">
          Zu den Verben springen
        </a>
        <header className="site-head">
          <Link href="/" className="brand" aria-label="deutschAI Startseite">
            deutschAI
          </Link>
          <nav aria-label="Hauptnavigation">
            <Link href="/#entdecken">Alle Verben</Link>
            <Link href="/kino">Diashow</Link>
          </nav>
        </header>
        {children}
        <footer className="site-foot">
          <p>Bilder und Videos sind KI-generiert (Qwen-Image, Wan 2.2). Aussprache über die Sprachausgabe deines Browsers.</p>
        </footer>
      </body>
    </html>
  );
}
