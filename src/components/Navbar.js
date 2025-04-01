// src/components/Navbar.js
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, user, isLoaded } = useUser();

  // 認証が必要なパスかどうかをチェック
  const isAuthPage = pathname.startsWith("/auth/");

  // ホームページかどうかをチェック
  const isHomePage = pathname === "/";

  // ダッシュボードやその他の認証済みページかどうかをチェック
  const isProtectedPage = !isAuthPage && !isHomePage;

  return (
    <nav className="bg-white border-b border-gray-200 fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* ロゴ / ブランド名 */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-indigo-600">
                StudyTracker
              </Link>
            </div>
          </div>

          {/* ナビゲーションリンク - モバイルでは非表示 */}
          {isLoaded && isSignedIn && (
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <Link href="/dashboard" className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/dashboard" ? "text-indigo-600" : "text-gray-700 hover:text-indigo-600"}`}>
                ダッシュボード
              </Link>
              <Link href="/tasks" className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/tasks" ? "text-indigo-600" : "text-gray-700 hover:text-indigo-600"}`}>
                タスク
              </Link>
              <Link href="/notes" className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/notes" ? "text-indigo-600" : "text-gray-700 hover:text-indigo-600"}`}>
                メモ
              </Link>
              <Link href="/timer" className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/timer" ? "text-indigo-600" : "text-gray-700 hover:text-indigo-600"}`}>
                タイマー
              </Link>
              <Link href="/analytics" className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/analytics" ? "text-indigo-600" : "text-gray-700 hover:text-indigo-600"}`}>
                分析
              </Link>
            </div>
          )}

          {/* 右側のボタン */}
          <div className="flex items-center">
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        userButtonBox: "ml-4",
                      },
                    }}
                  />
                ) : (
                  <div className="flex space-x-4">
                    <SignInButton mode="modal">
                      <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-gray-50">ログイン</button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">新規登録</button>
                    </SignUpButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
