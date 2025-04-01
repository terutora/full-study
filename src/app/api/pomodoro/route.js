// src/app/api/pomodoro/route.js
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req) {
  try {
    // ユーザー認証を確認（APIルートが認証に対応するようにする場合）
    const { userId } = getAuth(req);

    // クエリパラメータから日付を取得
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    // 暫定的に空のデータを返す（データベース接続前）
    const studyData = {
      userId: userId || "guest",
      date,
      todayStudyTime: 0,
      todayPomodoros: 0,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(studyData);
  } catch (error) {
    console.error("Error fetching pomodoro data:", error);
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    // ユーザー認証を確認（APIルートが認証に対応するようにする場合）
    const { userId } = getAuth(req);

    // リクエストボディからデータを取得
    const data = await req.json();

    // データを検証
    if (!data || (data.todayStudyTime === undefined && data.todayStudyTime !== 0)) {
      return NextResponse.json({ error: "無効なデータです" }, { status: 400 });
    }

    // 暫定的に成功レスポンスを返す（データベース保存前）
    const savedData = {
      ...data,
      userId: userId || "guest",
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(savedData);
  } catch (error) {
    console.error("Error saving pomodoro data:", error);
    return NextResponse.json({ error: "データの保存に失敗しました" }, { status: 500 });
  }
}
