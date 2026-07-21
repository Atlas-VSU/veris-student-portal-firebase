import { Fraunces, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
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
