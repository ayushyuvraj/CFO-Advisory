import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "@/context/AuthContext";
import { EquilibriumSceneProvider } from "@/context/EquilibriumSceneContext";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { Navbar } from "@/components/layout/Navbar";
import { LoginModal } from "@/components/auth/LoginModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KPMG CFO Advisory | Orchestrate Finance at Executive Velocity",
  description:
    "KPMG CFO Advisory executive showcase and synchronized Workflows Hub for enterprise performance, intelligent close, treasury, and AI finance automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body className="min-h-[100dvh] bg-[#030816] text-[#F4F7FB] antialiased selection:bg-[#1E6BFF]/30 selection:text-[#F4F7FB]">
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <EquilibriumSceneProvider>
              <SmoothScrollProvider>
                <Navbar />
                <main>{children}</main>
                <LoginModal />
              </SmoothScrollProvider>
            </EquilibriumSceneProvider>
          </AuthProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
