import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "@/context/AuthContext";
import { WorkflowsNavProvider } from "@/context/WorkflowsNavContext";
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
      className={`${geistSans.variable} ${geistMono.variable} light`}
    >
      <body className="min-h-[100dvh] bg-white text-[#0C233C] antialiased selection:bg-[#1E49E2]/15 selection:text-[#00338D]">
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <WorkflowsNavProvider>
              <EquilibriumSceneProvider>
                <SmoothScrollProvider>
                  <Navbar />
                  <main>{children}</main>
                  <LoginModal />
                </SmoothScrollProvider>
              </EquilibriumSceneProvider>
            </WorkflowsNavProvider>
          </AuthProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
