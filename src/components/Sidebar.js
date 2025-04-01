// src/components/Sidebar.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const { isSignedIn, user, isLoaded } = useUser();

  // 認証が必要なパスかどうかをチェック
  const isAuthPage = pathname.startsWith("/auth/");

  // ホームページかどうかをチェック
  const isHomePage = pathname === "/";

  // サイドバーを表示するかどうか
  const showSidebar = isLoaded && isSignedIn && !isAuthPage && !isHomePage;

  const navigation = [
    { name: "ダッシュボード", href: "/dashboard", icon: "📊" },
    { name: "タスク", href: "/tasks", icon: "✓" },
    { name: "メモ", href: "/notes", icon: "📝" },
    { name: "タイマー", href: "/timer", icon: "⏱️" },
    { name: "分析", href: "/analytics", icon: "📈" },
  ];

  // モバイル表示時にクリックでサイドバーを閉じる
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    // 初期表示時とリサイズ時に実行
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (!showSidebar) {
    return null;
  }

  return (
    <aside className={`bg-indigo-700 text-white fixed inset-y-0 left-0 z-20 transition-all duration-300 ease-in-out transform ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0 md:w-16"}`}>
      {/* トグルボタン */}
      <button className="absolute right-0 mt-4 mr-4 md:hidden" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "✖" : "☰"}
      </button>

      <div className="flex flex-col h-full">
        {/* ユーザープロフィール情報 */}
        <div className="px-4 py-6 text-center border-b border-indigo-600">
          <div className="w-16 h-16 rounded-full bg-indigo-500 mx-auto mb-2 flex items-center justify-center">{user?.imageUrl ? <img src={user.imageUrl} alt={user.fullName || "User"} className="w-full h-full rounded-full object-cover" /> : <span className="text-2xl">👤</span>}</div>
          {isOpen && (
            <div>
              <h2 className="text-lg font-semibold">{user?.fullName || "ユーザー"}</h2>
              <p className="text-xs text-indigo-200">{user?.primaryEmailAddress?.emailAddress || "user@example.com"}</p>
            </div>
          )}
        </div>

        {/* ナビゲーションリンク */}
        <div className="py-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link href={item.href} className={`flex items-center px-4 py-3 transition-colors ${pathname === item.href ? "bg-indigo-800 text-white" : "text-indigo-100 hover:bg-indigo-600"}`}>
                  <span className="mr-3 text-xl">{item.icon}</span>
                  {isOpen && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 設定リンク */}
        <div className="border-t border-indigo-600 p-4">
          <Link href="/settings" className="flex items-center text-indigo-100 hover:text-white">
            <span className="mr-3">⚙️</span>
            {isOpen && <span>設定</span>}
          </Link>
        </div>
      </div>
    </aside>
  );
}
