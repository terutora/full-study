// src/app/dashboard/page.js
"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { analyticsService, taskService, noteService } from "@/lib/supabase";

export default function Dashboard() {
  const { isSignedIn, user, isLoaded } = useUser();

  // 各データの状態
  const [studyData, setStudyData] = useState({
    todayStudyTime: 0,
    todayPomodoros: 0,
    streak: 1,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);

  // 読み込み状態
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useLocalStorage, setUseLocalStorage] = useState(false); // フォールバック用

  // ローカルストレージからデータをロードする関数（フォールバック用）
  const loadFromLocalStorage = async () => {
    if (typeof window === "undefined") return false;

    try {
      console.log("ローカルストレージからデータをロード中");
      // 今日の日付
      const today = new Date().toISOString().split("T")[0];

      // ユーザーID
      const userId = user?.id || "guest";

      // 学習時間データを読み込む
      const storageKey = `studyData_${today}`;
      const storedData = localStorage.getItem(storageKey);

      if (storedData) {
        const data = JSON.parse(storedData);
        setStudyData((prev) => ({
          ...prev,
          todayStudyTime: data.todayStudyTime || data.study_time_seconds || 0,
          todayPomodoros: data.todayPomodoros || data.pomodoro_count || 0,
        }));
      }

      // タスクデータを読み込む
      const tasksKey = `tasks_${userId}`;
      const storedTasks = localStorage.getItem(tasksKey);

      if (storedTasks) {
        const allTasks = JSON.parse(storedTasks);

        // 直近で更新されたタスク
        const sorted = [...allTasks].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        setRecentTasks(sorted.slice(0, 5));

        // 期限が近いタスク
        const upcoming = allTasks.filter((task) => !task.completed && task.due).sort((a, b) => new Date(a.due) - new Date(b.due));
        setUpcomingTasks(upcoming.slice(0, 5));
      }

      // メモデータを読み込む
      const notesKey = `notes_${userId}`;
      const storedNotes = localStorage.getItem(notesKey);

      if (storedNotes) {
        const allNotes = JSON.parse(storedNotes);

        // 直近で更新されたメモ
        const sortedNotes = [...allNotes].sort((a, b) => new Date(b.updatedAt || b.updated_at) - new Date(a.updatedAt || a.updated_at));
        setRecentNotes(sortedNotes.slice(0, 3));
      }

      // 連続学習日数（ダミーデータ、将来的には実際のデータベースから取得）
      setStudyData((prev) => ({
        ...prev,
        streak: 5, // 例として5日間としています
      }));

      return true;
    } catch (err) {
      console.error("ローカルストレージからのデータ読み込みエラー:", err);
      return false;
    }
  };

  // Supabaseからデータを読み込む関数
  const loadFromSupabase = async () => {
    try {
      console.log("Supabaseからデータをロード中");
      const today = new Date().toISOString().split("T")[0];

      // 1. 今日の学習データを取得
      const timerData = await analyticsService.getStudyTimeData(user.id, today, today);

      if (timerData && timerData.length > 0) {
        setStudyData((prev) => ({
          ...prev,
          todayStudyTime: timerData[0].study_time_seconds || 0,
          todayPomodoros: timerData[0].pomodoro_count || 0,
        }));
      }

      // 2. 学習ストリークを取得
      const streak = await analyticsService.getStudyStreak(user.id);
      setStudyData((prev) => ({
        ...prev,
        streak: streak,
      }));

      // 3. 最近のタスクを取得
      const allTasks = await taskService.getUserTasks(user.id);

      // 直近で更新されたタスク
      const sortedTasks = [...allTasks].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      setRecentTasks(sortedTasks.slice(0, 5));

      // 期限が近いタスク
      const upcomingTasksList = allTasks.filter((task) => !task.completed && task.due).sort((a, b) => new Date(a.due) - new Date(b.due));
      setUpcomingTasks(upcomingTasksList.slice(0, 5));

      // 4. 最近のメモを取得
      const allNotes = await noteService.getUserNotes(user.id);

      // 直近で更新されたメモ
      const sortedNotes = [...allNotes].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      setRecentNotes(sortedNotes.slice(0, 3));

      return true;
    } catch (err) {
      console.error("Supabaseからのデータ読み込みエラー:", err);
      return false;
    }
  };

  // ダッシュボードデータを読み込む関数
  const loadDashboardData = async () => {
    if (!isSignedIn || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      let success = false;

      if (!useLocalStorage) {
        // まずSupabaseからのロードを試みる
        success = await loadFromSupabase();
        if (!success) {
          console.log("Supabase接続に失敗、ローカルストレージにフォールバック");
          setUseLocalStorage(true);
          success = await loadFromLocalStorage();
        }
      } else {
        // ローカルストレージからロード
        success = await loadFromLocalStorage();
      }

      if (!success) {
        throw new Error("データのロードに失敗しました");
      }
    } catch (err) {
      console.error("ダッシュボードデータロードエラー:", err);
      setError("データの読み込み中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザーが認証されたらデータをロード
  useEffect(() => {
    if (isSignedIn) {
      loadDashboardData();
    }
  }, [isSignedIn, user?.id]);

  // データソースが変更された場合も再ロード
  useEffect(() => {
    if (isSignedIn) {
      loadDashboardData();
    }
  }, [useLocalStorage]);

  // 時間のフォーマット（秒→hh:mm:ss）
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 日付をフォーマット
  const formatDate = (dateString) => {
    if (!dateString) return "";

    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("ja-JP", options);
  };

  // 相対的な日付表示
  const getRelativeTimeString = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "今日";
    } else if (diffDays === 1) {
      return "昨日";
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}週間前`;
    } else {
      return formatDate(dateString);
    }
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      {isSignedIn && (
        <div className="mb-6">
          <h2 className="text-xl text-gray-700">こんにちは、{user.firstName || user.username || "ユーザー"}さん！</h2>
          <p className="text-gray-600">今日も学習を頑張りましょう。</p>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white p-10 rounded-lg shadow text-center">
          <p className="text-gray-500">データを読み込み中...</p>
        </div>
      ) : (
        <>
          {/* 学習サマリー */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase mb-2">今日の勉強時間</h2>
              <div className="flex items-end">
                <span className="text-3xl font-bold text-indigo-600">{formatTime(studyData.todayStudyTime)}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase mb-2">完了ポモドーロ</h2>
              <div className="flex items-end">
                <span className="text-3xl font-bold text-indigo-600">{studyData.todayPomodoros}</span>
                <span className="text-sm ml-2 text-gray-600">回</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase mb-2">学習ストリーク</h2>
              <div className="flex items-end">
                <span className="text-3xl font-bold text-indigo-600">{studyData.streak}</span>
                <span className="text-sm ml-2 text-gray-600">日連続</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 最近のタスク */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium">最近のタスク</h2>
                <Link href="/tasks" className="text-sm text-indigo-600 hover:text-indigo-800">
                  すべて表示 →
                </Link>
              </div>

              {recentTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">タスクがありません</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {recentTasks.map((task) => (
                    <li key={task.id} className="py-3 flex justify-between items-center">
                      <div className="flex items-center">
                        <input type="checkbox" checked={task.completed} readOnly className="mr-3" />
                        <div>
                          <div className={`font-medium ${task.completed ? "line-through text-gray-500" : "text-gray-900"}`}>{task.title}</div>
                          <div className="flex items-center mt-1">
                            {task.category && <span className="mr-2 px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">{task.category}</span>}
                            {task.updated_at && <span className="text-xs text-gray-500">{getRelativeTimeString(task.updated_at)}に更新</span>}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 最近のメモ */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium">最近のメモ</h2>
                <Link href="/notes" className="text-sm text-indigo-600 hover:text-indigo-800">
                  すべて表示 →
                </Link>
              </div>

              {recentNotes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">メモがありません</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {recentNotes.map((note) => (
                    <li key={note.id} className="py-3">
                      <h3 className="font-medium">{note.title}</h3>
                      <p className="text-sm text-gray-600 truncate mt-1">{note.content.split("\n")[0].replace(/^#+ /, "")}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-500">{getRelativeTimeString(note.updatedAt || note.updated_at)}に更新</span>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-2">
                            {note.tags.slice(0, 2).map((tag, index) => (
                              <span key={index} className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800">
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 2 && <span className="text-xs text-gray-500">+{note.tags.length - 2}</span>}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 期限が近いタスク */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">期限が近いタスク</h2>
              <Link href="/tasks" className="text-sm text-indigo-600 hover:text-indigo-800">
                すべて表示 →
              </Link>
            </div>

            {upcomingTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">期限が設定されたタスクがありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タスク</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">期日</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">優先度</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {upcomingTasks.map((task) => (
                      <tr key={task.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{task.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{task.category && <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">{task.category}</span>}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(task.due)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${task.priority === "high" ? "bg-red-100 text-red-800" : task.priority === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 学習セクション */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-medium mb-4">学習を始める</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/timer" className="block p-6 bg-indigo-50 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition">
                <div className="text-3xl mb-2">⏱️</div>
                <h3 className="font-medium text-lg mb-1">ポモドーロタイマー</h3>
                <p className="text-sm text-gray-600">25分の集中と5分の休憩で効率的に学習</p>
              </Link>

              <Link href="/tasks" className="block p-6 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition">
                <div className="text-3xl mb-2">✓</div>
                <h3 className="font-medium text-lg mb-1">タスク管理</h3>
                <p className="text-sm text-gray-600">学習タスクを整理して効率的に進める</p>
              </Link>

              <Link href="/notes" className="block p-6 bg-yellow-50 rounded-lg border border-yellow-100 hover:bg-yellow-100 transition">
                <div className="text-3xl mb-2">📝</div>
                <h3 className="font-medium text-lg mb-1">メモ作成</h3>
                <p className="text-sm text-gray-600">学んだことをマークダウンで記録</p>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
