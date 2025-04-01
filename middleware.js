// middleware.js
import { clerkMiddleware } from "@clerk/nextjs/server";

// シンプルなミドルウェア設定
export default clerkMiddleware({
  // 公開ルートの設定
  publicRoutes: [
    "/",
    "/auth/signin",
    "/auth/signup",
    "/api/webhook/clerk",
    "/api/pomodoro",
    "/api/tasks",
    "/api/notes", // メモ管理APIを追加
  ],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
