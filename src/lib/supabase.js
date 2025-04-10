// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

// 環境変数の値をチェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl ? "設定済み" : "未設定");
console.log("Supabase Anon Key:", supabaseAnonKey ? "設定済み" : "未設定");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase環境変数が設定されていません。");
}

// Supabaseクライアントの初期化
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// 集計関数を使わない接続テスト関数
export const testSupabaseConnection = async () => {
  try {
    // テーブルに正しくアクセス
    const { data, error } = await supabase.from("timer_data").select("id").limit(1);

    if (error) {
      console.error("Supabase基本接続エラー:", JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    console.log("Supabase基本接続成功:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Supabaseテスト例外:", err);
    return { success: false, error: err };
  }
};

// ユーザーID検証と整形のヘルパー関数
const validateUserId = (userId) => {
  if (!userId) {
    console.error("ユーザーIDが指定されていません");
    throw new Error("ユーザーIDが必要です");
  }

  // ユーザーIDの型を確認して文字列に変換
  const userIdStr = String(userId);
  console.log(`使用するユーザーID: ${userIdStr} (型: ${typeof userId})`);

  return userIdStr;
};

// タイマーデータ関連の操作をまとめたヘルパー関数
export const timerService = {
  // ユーザーの当日のタイマーデータを取得（.singleを使わない方式）
  async getUserTimerData(userId, date) {
    try {
      // ユーザーIDを検証して整形
      const userIdStr = validateUserId(userId);
      console.log(`タイマーデータを取得しています: userId=${userIdStr}, date=${date}`);

      // 日付形式の正規化
      const dateStr = new Date(date).toISOString().split("T")[0];
      console.log(`正規化された日付: ${dateStr}`);

      // データ取得クエリ実行前のパラメータ確認
      console.log(`実行するクエリパラメータ: `, { user_id: userIdStr, date: dateStr });

      // クエリの実行（.single()を使わない）
      const { data, error } = await supabase.from("timer_data").select("*").eq("user_id", userIdStr).eq("date", dateStr);

      if (error) {
        console.error("タイマーデータ取得エラー:", JSON.stringify(error, null, 2));
        throw error;
      }

      // 配列データを処理
      console.log(`取得したデータ件数: ${data ? data.length : 0}`);

      if (!data || data.length === 0) {
        console.log("該当するタイマーデータはありません。");
        return null;
      }

      // 最初のデータを使用
      const timerData = data[0];
      console.log("取得したタイマーデータ:", timerData);
      return timerData;
    } catch (err) {
      console.error("getUserTimerData処理中のエラー:", err.message || JSON.stringify(err));
      throw err;
    }
  },

  // 全てのタイマーデータを取得（デバッグ用）
  async getAllTimerData() {
    try {
      console.log("全タイマーデータを取得しています");

      const { data, error } = await supabase.from("timer_data").select("*").order("date", { ascending: false });

      if (error) {
        console.error("タイマーデータ全取得エラー:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log(`全部で${data.length}件のデータを取得しました`);
      return data;
    } catch (err) {
      console.error("getAllTimerData処理中のエラー:", err.message || JSON.stringify(err));
      throw err;
    }
  },

  // テスト用のタイマーデータ作成（デバッグ用）
  async createTestData(userId) {
    try {
      const userIdStr = validateUserId(userId);
      const today = new Date().toISOString().split("T")[0];

      console.log(`テスト用データを作成します: userId=${userIdStr}, date=${today}`);

      const testData = {
        user_id: userIdStr,
        date: today,
        study_time_seconds: 1800, // 30分
        pomodoro_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 既存のデータを削除（同じ日付のデータがある場合）
      await supabase.from("timer_data").delete().eq("user_id", userIdStr).eq("date", today);

      // 新しいデータを挿入
      const { data, error } = await supabase.from("timer_data").insert(testData).select();

      if (error) {
        console.error("テストデータ作成エラー:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("テストデータ作成成功:", data);
      return data;
    } catch (err) {
      console.error("createTestData処理中のエラー:", err.message || JSON.stringify(err));
      throw err;
    }
  },

  // データベースのテーブル内容を表示（デバッグ用）
  async showTableContent() {
    try {
      console.log("テーブル内容の確認を実行します");

      // タイマーデータテーブルのデータを取得
      const { data, error } = await supabase.from("timer_data").select("*");

      if (error) {
        console.error("テーブル内容取得エラー:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("テーブル内容:", data);
      return data;
    } catch (err) {
      console.error("showTableContent処理中のエラー:", err.message || JSON.stringify(err));
      throw err;
    }
  },

  // タイマーデータを保存または更新
  async saveTimerData(userId, date, studyTime, pomodoroCount) {
    try {
      // ユーザーIDを検証して整形
      const userIdStr = validateUserId(userId);
      console.log(`タイマーデータを保存しています: userId=${userIdStr}, date=${date}, studyTime=${studyTime}, pomodoroCount=${pomodoroCount}`);

      // 日付形式の正規化
      const dateStr = new Date(date).toISOString().split("T")[0];

      // upsert操作を使用（挿入または更新）
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
            onConflict: "user_id,date", // 競合キーを明示的に指定
          }
        )
        .select();

      if (error) {
        console.error("タイマーデータupsertエラー:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("保存されたデータ:", data);
      return data;
    } catch (err) {
      console.error("saveTimerData処理中のエラー:", err.message || JSON.stringify(err));
      throw err;
    }
  },

  // 残りのメソッドは変更なし
};

export default supabase;
