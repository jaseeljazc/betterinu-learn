import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Betterinu LMS",
  description:
    "A weekly skill-building LMS — courses, quizzes, progress, XP, and streaks.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Betterinu LMS",
    description:
      "A weekly skill-building LMS — courses, quizzes, progress, XP, and streaks.",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "Betterinu LMS",
      },
    ],
  },
};

/**
 * Bare root layout. Each route group adds its own layout:
 *   (student)/layout.tsx → Navbar + ToastHost
 *   (admin)/layout.tsx   → AdminSidebar + header
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
