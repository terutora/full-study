// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

// 環境変数の値を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数のチェック
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase環境変数が設定されていません。");
}

// Supabaseクライアントの初期化
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// 接続テスト関数
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from("timer_data").select("id").limit(1);

    if (error) {
      console.error("Supabase接続エラー:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Supabase接続例外:", err);
    return { success: false, error: err };
  }
};

// ユーザーID検証と整形のヘルパー関数
const validateUserId = (userId) => {
  if (!userId) {
    throw new Error("ユーザーIDが必要です");
  }
  return String(userId);
};

// タイマーデータ関連の操作をまとめたヘルパー関数
export const timerService = {
  // ユーザーの当日のタイマーデータを取得
  async getUserTimerData(userId, date) {
    try {
      // ユーザーIDを検証して整形
      const userIdStr = validateUserId(userId);

      // 日付形式の正規化
      const dateStr = new Date(date).toISOString().split("T")[0];

      // クエリの実行
      const { data, error } = await supabase.from("timer_data").select("*").eq("user_id", userIdStr).eq("date", dateStr);

      if (error) {
        console.error("タイマーデータ取得エラー:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // 最初のデータを使用
      return data[0];
    } catch (err) {
      console.error("データ取得エラー:", err);
      throw err;
    }
  },

  // タイマーデータを保存または更新
  async saveTimerData(userId, date, studyTime, pomodoroCount) {
    try {
      // ユーザーIDを検証して整形
      const userIdStr = validateUserId(userId);

      // 日付形式の正規化
      const dateStr = new Date(date).toISOString().split("T")[0];

      // upsert操作で保存（複合ユニーク制約が必要）
      const { data, error } = await supabase
        .from("timer_data")
        .upsert(
          {
            user_id: userIdStr,
            date: dateStr,
            study_time_seconds: studyTime,
            pomodoro_count: pomodoroCount,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,date",
          }
        )
        .select();

      if (error) {
        console.error("タイマーデータ保存エラー:", error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error("データ保存エラー:", err);
      throw err;
    }
  },
};

export default supabase;
