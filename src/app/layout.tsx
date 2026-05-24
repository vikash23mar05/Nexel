import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ['italic', 'normal'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Nexel - AI Document Workspace",
  description: "Transform your PDFs into Interactive Learning Materials",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} dark antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-text-primary bg-[#0A0A0A]">
        {children}
      </body>
    </html>
  );
}
