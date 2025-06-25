import { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { Navbar } from "@/components/custom/navbar";
import { ThemeProvider } from "@/components/custom/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "SuperQuant | AI Data Analyst",
  description:
    "SuperQuant - Replace the need for data analysts in your company with AI",
  icons: {
    icon: '/images/superquant-logo.svg'
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider> 
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          <Navbar />
          {children}
        </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
