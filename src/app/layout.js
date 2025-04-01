// src/app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "StudyTracker - 勉強管理アプリ",
  description: "効率的に勉強の進捗を追跡し、学習習慣を向上させるアプリ",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body className={inter.className}>
          <Navbar />
          <div className="flex h-screen pt-16">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-64 p-6 bg-gray-50 overflow-y-auto">{children}</main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
