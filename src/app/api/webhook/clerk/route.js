// src/app/api/webhook/clerk/route.js
import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

// Clerkのウェブフックシークレット
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error("Please add CLERK_WEBHOOK_SECRET to .env file");
}

export async function POST(req) {
  // Headerからsvix-idとsvix-signatureを取得
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // 必須ヘッダーがない場合はエラー
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error: Missing svix headers", { status: 400 });
  }

  // リクエストボディを取得
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // ウェブフックを検証
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse("Error: Invalid signature", { status: 400 });
  }

  // イベントタイプと対象のユーザーIDを取得
  const { type } = evt;
  const { id: userId } = evt.data;

  console.log(`Webhook received: ${type} for user ${userId}`);

  // ユーザー削除時の処理
  if (type === "user.deleted") {
    try {
      // ユーザーの設定データを削除
      await supabase.from("user_settings").delete().eq("user_id", userId);

      // ユーザーのタイマーデータを削除
      await supabase.from("timer_data").delete().eq("user_id", userId);

      // ユーザーのタスクを削除
      await supabase.from("tasks").delete().eq("user_id", userId);

      // ユーザーのメモを削除（関連タグは外部キー制約で自動削除）
      await supabase.from("notes").delete().eq("user_id", userId);

      // ユーザーの実績を削除
      await supabase.from("user_achievements").delete().eq("user_id", userId);

      console.log(`Successfully deleted all data for user ${userId}`);

      return NextResponse.json({ message: "User data deleted successfully" });
    } catch (error) {
      console.error("Error deleting user data:", error);
      return new NextResponse("Error deleting user data", { status: 500 });
    }
  }

  // その他のイベントタイプに対するハンドリング
  // 必要に応じて他のイベントタイプも処理可能

  return NextResponse.json({ message: `Webhook received: ${type}` });
}
