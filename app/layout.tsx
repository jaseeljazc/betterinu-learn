import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { ToastHost } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnForge LMS",
  description: "A weekly skill-building LMS demo with courses, quizzes, progress, XP, and streaks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
