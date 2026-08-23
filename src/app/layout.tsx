import type { Metadata } from "next";
import {
  Playfair_Display,
  Source_Serif_4,
  Geist,
  Geist_Mono,
} from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin", "vietnamese"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrashWhere — Phân loại rác thải",
  description:
    "Chụp ảnh một vật và TrashWhere sẽ phân loại rác thải, giải thích lý do, và hướng dẫn cách xử lý đúng cách.",
  keywords: ["phân loại rác", "rác thải", "môi trường", "học sinh"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${playfair.variable} ${sourceSerif.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
