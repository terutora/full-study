// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

// Supabaseの設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabaseクライアントの初期化
const supabase = createClient(supabaseUrl, supabaseKey);

// 接続テスト用の関数
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from("health_check").select("*").limit(1);
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Supabase接続エラー:", error);
    return { success: false, error };
  }
};

// タイマーデータのサービス
export const timerService = {
  // ユーザーのタイマーデータを取得
  getUserTimerData: async (userId, date) => {
    try {
      const { data, error } = await supabase.from("timer_data").select("*").eq("user_id", userId).eq("date", date).single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116はデータが見つからないエラー
      return data || null;
    } catch (error) {
      console.error("タイマーデータ取得エラー:", error);
      throw error;
    }
  },

  // タイマーデータを保存
  saveTimerData: async (userId, date, studyTime, pomodoroCount) => {
    try {
      // 既存データの有無を確認
      const { data: existingData } = await supabase.from("timer_data").select("id").eq("user_id", userId).eq("date", date).single();

      const dataToSave = {
        user_id: userId,
        date,
        study_time_seconds: studyTime,
        pomodoro_count: pomodoroCount,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existingData) {
        // 既存データを更新
        result = await supabase.from("timer_data").update(dataToSave).eq("id", existingData.id);
      } else {
        // 新規データを挿入
        result = await supabase.from("timer_data").insert([dataToSave]);
      }

      if (result.error) throw result.error;
      return { success: true, data: result.data };
    } catch (error) {
      console.error("タイマーデータ保存エラー:", error);
      throw error;
    }
  },
};

// タスク管理のサービス
export const taskService = {
  // ユーザーのタスクを取得
  getUserTasks: async (userId) => {
    try {
      const { data, error } = await supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("タスク取得エラー:", error);
      throw error;
    }
  },

  // タスクを作成
  createTask: async (userId, taskData) => {
    try {
      const newTask = {
        user_id: userId,
        title: taskData.title,
        description: taskData.description || "",
        category: taskData.category || "",
        estimated: taskData.estimated || "",
        priority: taskData.priority || "medium",
        due: taskData.due || null,
        completed: taskData.completed || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("tasks").insert([newTask]).select().single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("タスク作成エラー:", error);
      throw error;
    }
  },

  // タスクを更新
  updateTask: async (userId, taskId, taskData) => {
    try {
      const updatedTask = {
        ...taskData,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("tasks").update(updatedTask).eq("id", taskId).eq("user_id", userId).select().single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("タスク更新エラー:", error);
      throw error;
    }
  },

  // タスクを削除
  deleteTask: async (userId, taskId) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("タスク削除エラー:", error);
      throw error;
    }
  },
};

// メモ管理のサービス
export const noteService = {
  // ユーザーのメモを取得
  getUserNotes: async (userId) => {
    try {
      const { data, error } = await supabase.from("notes").select("*, note_tags(tag_id, tags(name))").eq("user_id", userId).order("updated_at", { ascending: false });

      if (error) throw error;

      // タグ情報を整形
      const formattedData = data.map((note) => ({
        ...note,
        tags: note.note_tags ? note.note_tags.map((tag) => tag.tags.name) : [],
      }));

      return formattedData || [];
    } catch (error) {
      console.error("メモ取得エラー:", error);
      throw error;
    }
  },

  // メモを作成
  createNote: async (userId, noteData) => {
    try {
      // トランザクション開始
      const newNote = {
        user_id: userId,
        title: noteData.title,
        content: noteData.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. メモを作成
      const { data: note, error: noteError } = await supabase.from("notes").insert([newNote]).select().single();

      if (noteError) throw noteError;

      // 2. タグを処理
      if (noteData.tags && noteData.tags.length > 0) {
        for (const tagName of noteData.tags) {
          // 2.1 タグが存在するか確認、なければ作成
          let { data: existingTag, error: tagSelectError } = await supabase.from("tags").select("id").eq("name", tagName).single();

          if (tagSelectError && tagSelectError.code !== "PGRST116") throw tagSelectError;

          let tagId;
          if (!existingTag) {
            const { data: newTag, error: tagInsertError } = await supabase
              .from("tags")
              .insert([{ name: tagName }])
              .select("id")
              .single();

            if (tagInsertError) throw tagInsertError;
            tagId = newTag.id;
          } else {
            tagId = existingTag.id;
          }

          // 2.2 メモとタグの関連付け
          const { error: relationError } = await supabase.from("note_tags").insert([
            {
              note_id: note.id,
              tag_id: tagId,
            },
          ]);

          if (relationError) throw relationError;
        }
      }

      // 完成したメモと処理したタグを返す
      return {
        ...note,
        tags: noteData.tags || [],
      };
    } catch (error) {
      console.error("メモ作成エラー:", error);
      throw error;
    }
  },

  // メモを更新
  updateNote: async (userId, noteId, noteData) => {
    try {
      // 1. メモを更新
      const updateData = {
        title: noteData.title,
        content: noteData.content,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedNote, error: updateError } = await supabase.from("notes").update(updateData).eq("id", noteId).eq("user_id", userId).select().single();

      if (updateError) throw updateError;

      // 2. 既存のタグ関連を削除
      const { error: deleteRelationError } = await supabase.from("note_tags").delete().eq("note_id", noteId);

      if (deleteRelationError) throw deleteRelationError;

      // 3. 新しいタグを関連付け
      if (noteData.tags && noteData.tags.length > 0) {
        for (const tagName of noteData.tags) {
          // 3.1 タグが存在するか確認、なければ作成
          let { data: existingTag, error: tagSelectError } = await supabase.from("tags").select("id").eq("name", tagName).single();

          if (tagSelectError && tagSelectError.code !== "PGRST116") throw tagSelectError;

          let tagId;
          if (!existingTag) {
            const { data: newTag, error: tagInsertError } = await supabase
              .from("tags")
              .insert([{ name: tagName }])
              .select("id")
              .single();

            if (tagInsertError) throw tagInsertError;
            tagId = newTag.id;
          } else {
            tagId = existingTag.id;
          }

          // 3.2 メモとタグの関連付け
          const { error: relationError } = await supabase.from("note_tags").insert([
            {
              note_id: noteId,
              tag_id: tagId,
            },
          ]);

          if (relationError) throw relationError;
        }
      }

      // 更新したメモと処理したタグを返す
      return {
        ...updatedNote,
        tags: noteData.tags || [],
      };
    } catch (error) {
      console.error("メモ更新エラー:", error);
      throw error;
    }
  },

  // メモを削除
  deleteNote: async (userId, noteId) => {
    try {
      // 関連するタグのリレーションは外部キー制約で自動的に削除されます
      const { error } = await supabase.from("notes").delete().eq("id", noteId).eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("メモ削除エラー:", error);
      throw error;
    }
  },
};

// 分析データのサービス
export const analyticsService = {
  // 学習時間データを取得（指定期間）
  getStudyTimeData: async (userId, startDate, endDate) => {
    try {
      const { data, error } = await supabase.from("timer_data").select("*").eq("user_id", userId).gte("date", startDate).lte("date", endDate).order("date", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("学習時間データ取得エラー:", error);
      throw error;
    }
  },

  // タグ別メモ集計を取得
  getNoteTagCounts: async (userId) => {
    try {
      const { data, error } = await supabase.from("notes").select("note_tags(tag_id, tags(id, name))").eq("user_id", userId);

      if (error) throw error;

      // タグの出現回数を集計
      const tagCounts = {};
      data.forEach((note) => {
        if (note.note_tags) {
          note.note_tags.forEach((noteTag) => {
            const tagName = noteTag.tags.name;
            tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
          });
        }
      });

      // 配列形式に変換
      const result = Object.entries(tagCounts).map(([name, count]) => ({
        name,
        count,
      }));

      return result;
    } catch (error) {
      console.error("タグ集計取得エラー:", error);
      throw error;
    }
  },

  // 継続学習日数を計算
  getStudyStreak: async (userId) => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const { data, error } = await supabase.from("timer_data").select("date, study_time_seconds").eq("user_id", userId).gte("date", thirtyDaysAgo.toISOString().split("T")[0]).lte("date", today.toISOString().split("T")[0]).order("date", { ascending: false });

      if (error) throw error;

      // 有効な学習日（学習時間が一定以上）のみをフィルタリング
      const validStudyDays = data.filter((day) => day.study_time_seconds >= 300); // 5分以上の学習

      if (validStudyDays.length === 0) return 0;

      // 最新の学習日が今日でなければストリークは0
      const latestDate = new Date(validStudyDays[0].date);
      const todayDate = new Date(today.toISOString().split("T")[0]);
      if (latestDate.getTime() !== todayDate.getTime()) return 0;

      // ストリークをカウント
      let streak = 1;
      let currentDate = todayDate;

      for (let i = 1; i < validStudyDays.length; i++) {
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);

        const studyDate = new Date(validStudyDays[i].date);

        if (studyDate.getTime() === prevDate.getTime()) {
          streak++;
          currentDate = studyDate;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error("学習ストリーク計算エラー:", error);
      throw error;
    }
  },
};

export default supabase;
