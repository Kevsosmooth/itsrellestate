import type { Metadata } from "next";
import { jakarta } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nyrell Nunez | Licensed NYC Real Estate Agent",
  description:
    "Licensed real estate agent serving all five boroughs of NYC. Specializing in CityFHEPS, Section 8, and HASA subsidy program navigation for tenants and landlords.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
