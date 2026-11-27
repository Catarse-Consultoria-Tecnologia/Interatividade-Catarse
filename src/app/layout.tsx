import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "900"],
  style: ["normal", "italic"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600"],
});

// Fonte da identidade visual "Fechamento Mensal Folha" — usada só nas rotas
// novas (/genesis/*), sem substituir --font-sans (Inter) do resto da plataforma.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Catarse Interatividade",
    template: "%s · Catarse Interatividade",
  },
  description:
    "Plataforma de interatividade da Catarse — jogos e dinâmicas investigativas para pré/pós-aula.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1526",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${mono.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh bg-navy-950 font-sans text-paper-50 antialiased">{children}</body>
    </html>
  );
}
