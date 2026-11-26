import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fraunces = localFont({
  src: "./fonts/Fraunces-Latin.woff2",
  variable: "--font-fraunces",
  weight: "600 800",
  style: "normal",
  display: "swap",
});

const nunito = localFont({
  src: "./fonts/Nunito-Latin.woff2",
  variable: "--font-nunito",
  weight: "300 900",
  style: "normal",
  display: "swap",
});

export const metadata = {
  title: "VERIS Student Portal",
  description: "Student self-service portal for registration, record updates, and payments",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#2E7D32" />
      </head>
      <body
        className={`${fraunces.variable} ${nunito.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Toaster position="top-right" expand={false} richColors closeButton />
      </body>
    </html>
  );
}
