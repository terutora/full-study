// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabaseの環境変数が設定されていません。");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// タイマーデータ関連の操作をまとめたヘルパー関数
export const timerService = {
  // ユーザーの当日のタイマーデータを取得
  async getUserTimerData(userId, date) {
    const { data, error } = await supabase.from("timer_data").select("*").eq("user_id", userId).eq("date", date).single();

    if (error && error.code !== "PGSQL_NO_ROWS_RETURNED") {
      console.error("Error fetching timer data:", error);
      throw error;
    }

    return data;
  },

  // タイマーデータを保存または更新
  async saveTimerData(userId, date, studyTime, pomodoroCount) {
    // 既存のデータを確認
    const existingData = await this.getUserTimerData(userId, date).catch(() => null);

    if (existingData) {
      // 既存データの更新
      const { data, error } = await supabase
        .from("timer_data")
        .update({
          study_time_seconds: studyTime,
          pomodoro_count: pomodoroCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingData.id)
        .select();

      if (error) {
        console.error("Error updating timer data:", error);
        throw error;
      }

      return data;
    } else {
      // 新規データの作成
      const { data, error } = await supabase
        .from("timer_data")
        .insert({
          user_id: userId,
          date,
          study_time_seconds: studyTime,
          pomodoro_count: pomodoroCount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error("Error inserting timer data:", error);
        throw error;
      }

      return data;
    }
  },

  // 特定期間のタイマーデータを取得（分析用）
  async getTimerDataRange(userId, startDate, endDate) {
    const { data, error } = await supabase.from("timer_data").select("*").eq("user_id", userId).gte("date", startDate).lte("date", endDate).order("date", { ascending: true });

    if (error) {
      console.error("Error fetching timer data range:", error);
      throw error;
    }

    return data || [];
  },

  // ユーザーの学習統計を取得
  async getUserStats(userId) {
    // 合計学習時間
    const { data: totalTimeData, error: totalTimeError } = await supabase.from("timer_data").select("study_time_seconds").eq("user_id", userId);

    if (totalTimeError) {
      console.error("Error fetching total study time:", totalTimeError);
      throw totalTimeError;
    }

    const totalStudyTime = totalTimeData.reduce((sum, item) => sum + item.study_time_seconds, 0);

    // 合計ポモドーロ数
    const { data: totalPomodoroData, error: totalPomodoroError } = await supabase.from("timer_data").select("pomodoro_count").eq("user_id", userId);

    if (totalPomodoroError) {
      console.error("Error fetching total pomodoro count:", totalPomodoroError);
      throw totalPomodoroError;
    }

    const totalPomodoros = totalPomodoroData.reduce((sum, item) => sum + item.pomodoro_count, 0);

    // 連続学習日数（ストリーク）
    const today = new Date();
    let currentStreak = 0;

    for (let i = 0; i < 365; i++) {
      // 最大1年前まで確認
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];

      const { data, error } = await supabase.from("timer_data").select("id").eq("user_id", userId).eq("date", dateStr).single();

      if (error && error.code !== "PGSQL_NO_ROWS_RETURNED") {
        console.error("Error checking streak:", error);
        break;
      }

      if (!data) {
        // データがない日があれば、そこでストリーク終了
        break;
      }

      currentStreak += 1;
    }

    return {
      totalStudyTime,
      totalPomodoros,
      currentStreak,
    };
  },

  // 曜日別の平均学習時間を取得
  async getWeekdayAverage(userId) {
    const { data, error } = await supabase.from("timer_data").select("date, study_time_seconds").eq("user_id", userId);

    if (error) {
      console.error("Error fetching weekday data:", error);
      throw error;
    }

    // 曜日ごとのデータを集計
    const weekdayCounts = Array(7).fill(0); // 各曜日のデータ数
    const weekdayTotals = Array(7).fill(0); // 各曜日の合計時間

    data.forEach((item) => {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay(); // 0-6

      weekdayCounts[dayOfWeek]++;
      weekdayTotals[dayOfWeek] += item.study_time_seconds;
    });

    // 平均を計算
    const weekdayAverages = weekdayTotals.map((total, index) => {
      const count = weekdayCounts[index];
      return {
        dayOfWeek: index,
        dayName: ["日", "月", "火", "水", "木", "金", "土"][index],
        averageSeconds: count > 0 ? Math.round(total / count) : 0,
        totalSessions: count,
      };
    });

    return weekdayAverages;
  },

  // 月別の合計学習時間とポモドーロ数を取得
  async getMonthlyStats(userId, year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase.from("timer_data").select("date, study_time_seconds, pomodoro_count").eq("user_id", userId).gte("date", startDate).lte("date", endDate);

    if (error) {
      console.error("Error fetching monthly stats:", error);
      throw error;
    }

    // 月ごとにデータを集計
    const monthlyData = Array(12)
      .fill()
      .map(() => ({
        totalSeconds: 0,
        totalPomodoros: 0,
        daysStudied: 0,
      }));

    const monthlyDays = new Set(
      Array(12)
        .fill()
        .map(() => new Set())
    );

    data.forEach((item) => {
      const date = new Date(item.date);
      const month = date.getMonth(); // 0-11

      monthlyData[month].totalSeconds += item.study_time_seconds;
      monthlyData[month].totalPomodoros += item.pomodoro_count;

      // その月の学習日をセットに追加
      monthlyDays[month].add(item.date);
    });

    // 学習日数を計算
    monthlyData.forEach((item, index) => {
      item.daysStudied = monthlyDays[index].size;
    });

    // 結果を整形
    return monthlyData.map((item, index) => ({
      month: index + 1,
      monthName: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"][index],
      totalHours: Math.round(item.totalSeconds / 36) / 100, // 秒→時間（小数点2位まで）
      totalPomodoros: item.totalPomodoros,
      daysStudied: item.daysStudied,
    }));
  },
};

// ユーザーのメタデータ関連の操作
export const userService = {
  // ユーザー設定を取得
  async getUserSettings(userId) {
    const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).single();

    if (error && error.code !== "PGSQL_NO_ROWS_RETURNED") {
      console.error("Error fetching user settings:", error);
      throw error;
    }

    // デフォルト設定
    const defaultSettings = {
      pomodoro_minutes: 25,
      short_break_minutes: 5,
      long_break_minutes: 15,
      pomodoro_goal: 4,
      theme: "light",
    };

    return data || defaultSettings;
  },

  // ユーザー設定を保存
  async saveUserSettings(userId, settings) {
    // 既存の設定を確認
    const existingSettings = await this.getUserSettings(userId).catch(() => null);

    if (existingSettings && existingSettings.id) {
      // 既存設定の更新
      const { data, error } = await supabase
        .from("user_settings")
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSettings.id)
        .select();

      if (error) {
        console.error("Error updating user settings:", error);
        throw error;
      }

      return data;
    } else {
      // 新規設定の作成
      const { data, error } = await supabase
        .from("user_settings")
        .insert({
          user_id: userId,
          ...settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error("Error inserting user settings:", error);
        throw error;
      }

      return data;
    }
  },
};

// タスク関連の操作
export const taskService = {
  // ユーザーのタスク一覧を取得
  async getUserTasks(userId) {
    const { data, error } = await supabase.from("tasks").select("*").eq("user_id", userId).order("due_date", { ascending: true }).order("priority", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }

    return data || [];
  },

  // タスクを作成
  async createTask(userId, taskData) {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        ...taskData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("Error creating task:", error);
      throw error;
    }

    return data;
  },

  // タスクを更新
  async updateTask(taskId, taskData) {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        ...taskData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select();

    if (error) {
      console.error("Error updating task:", error);
      throw error;
    }

    return data;
  },

  // タスクを削除
  async deleteTask(taskId) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      console.error("Error deleting task:", error);
      throw error;
    }

    return true;
  },

  // 完了したタスク数を集計
  async getTaskStats(userId) {
    const { data, error } = await supabase.from("tasks").select("completed, created_at").eq("user_id", userId);

    if (error) {
      console.error("Error fetching task stats:", error);
      throw error;
    }

    const totalTasks = data.length;
    const completedTasks = data.filter((task) => task.completed).length;

    // 今週作成されたタスク
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // 今週の日曜日
    startOfWeek.setHours(0, 0, 0, 0);

    const tasksThisWeek = data.filter((task) => {
      const createdAt = new Date(task.created_at);
      return createdAt >= startOfWeek;
    }).length;

    return {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      tasksThisWeek,
    };
  },
};

// メモ関連の操作
export const noteService = {
  // ユーザーのメモ一覧を取得
  async getUserNotes(userId) {
    const { data, error } = await supabase.from("notes").select("*, note_tags(tag)").eq("user_id", userId).order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      throw error;
    }

    // タグを配列形式に整形
    return (data || []).map((note) => ({
      ...note,
      tags: note.note_tags.map((tagObj) => tagObj.tag),
    }));
  },

  // メモを作成
  async createNote(userId, { title, content, tags = [] }) {
    // トランザクション的な操作（Supabaseでは本来のトランザクションはない）

    // 1. メモを作成
    const { data: noteData, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        title,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (noteError) {
      console.error("Error creating note:", noteError);
      throw noteError;
    }

    const noteId = noteData[0].id;

    // 2. タグを追加
    if (tags.length > 0) {
      const tagObjects = tags.map((tag) => ({
        note_id: noteId,
        tag: tag.trim(),
      }));

      const { error: tagError } = await supabase.from("note_tags").insert(tagObjects);

      if (tagError) {
        console.error("Error adding note tags:", tagError);
        // メモは作成されたがタグの追加に失敗した場合でも、メモは返す
      }
    }

    // 作成したメモとタグを返す
    return {
      ...noteData[0],
      tags,
    };
  },

  // メモを更新
  async updateNote(noteId, { title, content, tags = [] }) {
    // 1. メモを更新
    const { data: noteData, error: noteError } = await supabase
      .from("notes")
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .select();

    if (noteError) {
      console.error("Error updating note:", noteError);
      throw noteError;
    }

    // 2. 既存のタグを削除
    const { error: deleteTagError } = await supabase.from("note_tags").delete().eq("note_id", noteId);

    if (deleteTagError) {
      console.error("Error deleting existing tags:", deleteTagError);
      // タグの削除に失敗しても処理は続行
    }

    // 3. 新しいタグを追加
    if (tags.length > 0) {
      const tagObjects = tags.map((tag) => ({
        note_id: noteId,
        tag: tag.trim(),
      }));

      const { error: tagError } = await supabase.from("note_tags").insert(tagObjects);

      if (tagError) {
        console.error("Error adding new tags:", tagError);
        // タグの追加に失敗しても処理は続行
      }
    }

    // 更新したメモとタグを返す
    return {
      ...noteData[0],
      tags,
    };
  },

  // メモを削除
  async deleteNote(noteId) {
    // タグは外部キー制約で自動的に削除される
    const { error } = await supabase.from("notes").delete().eq("id", noteId);

    if (error) {
      console.error("Error deleting note:", error);
      throw error;
    }

    return true;
  },

  // タグ別のメモ数を取得
  async getTagStats(userId) {
    const { data, error } = await supabase.from("notes").select("id, note_tags(tag)").eq("user_id", userId);

    if (error) {
      console.error("Error fetching tag stats:", error);
      throw error;
    }

    // タグごとの出現回数を集計
    const tagCounts = {};
    data.forEach((note) => {
      note.note_tags.forEach((tagObj) => {
        const tag = tagObj.tag;
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // 降順でソート
    const sortedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return sortedTags;
  },
};

export default supabase;
