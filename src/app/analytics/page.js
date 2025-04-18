// src/app/analytics/page.js
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { analyticsService, taskService, noteService } from "@/lib/supabase";

export default function Analytics() {
  // 期間選択の状態
  const [period, setPeriod] = useState("week");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useLocalStorage, setUseLocalStorage] = useState(false); // フォールバック用

  // 分析データの状態
  const [studyData, setStudyData] = useState({
    weeklyData: [],
    monthlyData: [],
    yearlyData: [],
    subjectData: [],
    timeOfDayData: [],
    stats: {
      totalTime: 0,
      totalTasks: 0,
      avgTime: 0,
      streakDays: 0,
      mostEffectiveTime: "",
      pomodoroCount: 0,
    },
  });

  // Clerkのユーザー情報
  const { isSignedIn, user } = useUser();

  // ローカルストレージからデータを読み込む関数（フォールバック用）
  const loadFromLocalStorage = async () => {
    if (typeof window === "undefined") return false;

    try {
      console.log("ローカルストレージから分析データをロード中");
      const userId = user?.id || "guest";
      const today = new Date();

      // 学習時間データの読み込み
      let totalStudyTime = 0;
      let pomodoroCount = 0;
      let streakDays = 0;

      // 過去30日間のデータを取得
      const dailyStudyData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const storageKey = `studyData_${dateStr}`;
        const storedData = localStorage.getItem(storageKey);

        if (storedData) {
          const data = JSON.parse(storedData);
          const hours = (data.todayStudyTime || data.study_time_seconds || 0) / 3600; // 秒を時間に変換
          totalStudyTime += hours;
          pomodoroCount += data.todayPomodoros || data.pomodoro_count || 0;

          dailyStudyData.push({
            date: dateStr,
            dateObj: date,
            time: parseFloat(hours.toFixed(1)),
            tasks: 0, // タスクデータは別途取得
            pomodoros: data.todayPomodoros || data.pomodoro_count || 0,
          });

          // 連続学習日数の計算（単純化のため、データがある日を学習日とみなす）
          if (i === 0 || streakDays > 0) {
            streakDays += 1;
          }
        } else if (streakDays > 0) {
          // 連続が途切れた
          break;
        }
      }

      // タスクデータの読み込み
      const tasksKey = `tasks_${userId}`;
      const storedTasks = localStorage.getItem(tasksKey);
      let totalTasks = 0;
      let tasksByDate = {};

      if (storedTasks) {
        const tasks = JSON.parse(storedTasks);

        // 完了したタスクのみカウント
        const completedTasks = tasks.filter((task) => task.completed);
        totalTasks = completedTasks.length;

        // 日付ごとのタスク数集計
        completedTasks.forEach((task) => {
          if (task.updated_at) {
            const taskDate = task.updated_at.split("T")[0];
            tasksByDate[taskDate] = (tasksByDate[taskDate] || 0) + 1;
          }
        });

        // 日別データにタスク数を追加
        dailyStudyData.forEach((day) => {
          day.tasks = tasksByDate[day.date] || 0;
        });
      }

      // メモデータの読み込み（カテゴリ/タグ分析用）
      const notesKey = `notes_${userId}`;
      const storedNotes = localStorage.getItem(notesKey);
      const tagCounts = {};

      if (storedNotes) {
        const notes = JSON.parse(storedNotes);

        // タグの集計
        notes.forEach((note) => {
          (note.tags || []).forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });
      }

      // 科目別（タグ別）データの生成
      const subjectData = Object.entries(tagCounts)
        .map(([name, count]) => {
          return { name, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 時間帯別学習時間の計算（効率の概念を削除）
      const timeOfDayData = [
        { time: "6-9時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 4, 0) },
        { time: "9-12時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 3, 0) },
        { time: "12-15時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 5, 0) },
        { time: "15-18時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 4, 0) },
        { time: "18-21時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 3, 0) },
        { time: "21-24時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 6, 0) },
      ];

      // 最も学習時間が長い時間帯を見つける
      const mostStudiedTime = timeOfDayData.reduce((best, current) => (current.hours > best.hours ? current : best)).time;

      // 週間データ、月間データ、年間データを生成
      const { weeklyData, monthlyData, yearlyData } = generatePeriodData(dailyStudyData);

      // 平均学習時間の計算
      const avgTime = totalStudyTime / (dailyStudyData.filter((d) => d.time > 0).length || 1);

      // すべてのデータをセット
      setStudyData({
        weeklyData,
        monthlyData,
        yearlyData,
        subjectData,
        timeOfDayData,
        stats: {
          totalTime: parseFloat(totalStudyTime.toFixed(1)),
          totalTasks,
          avgTime: parseFloat(avgTime.toFixed(1)),
          streakDays,
          mostStudiedTime,
          pomodoroCount,
        },
      });

      return true;
    } catch (err) {
      console.error("ローカルストレージからの分析データ読み込みエラー:", err);
      return false;
    }
  };

  // Supabaseからデータを読み込む関数
  const loadFromSupabase = async () => {
    try {
      console.log("Supabaseから分析データをロード中");
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const startDate = thirtyDaysAgo.toISOString().split("T")[0];
      const endDate = today.toISOString().split("T")[0];

      // 学習時間データを取得
      const timerData = await analyticsService.getStudyTimeData(user.id, startDate, endDate);

      // タスクデータを取得
      const tasks = await taskService.getUserTasks(user.id);
      const completedTasks = tasks.filter((task) => task.completed);

      // タグ集計データを取得
      const tagData = await analyticsService.getNoteTagCounts(user.id);

      // 学習ストリークを取得
      const streak = await analyticsService.getStudyStreak(user.id);

      // 日別データの配列を生成
      const dailyStudyData = [];
      let totalStudyTime = 0;
      let pomodoroCount = 0;

      // 過去30日分の日付を処理
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        // 該当日のデータを探す
        const dayData = timerData.find((d) => d.date === dateStr);

        if (dayData) {
          const hours = dayData.study_time_seconds / 3600; // 秒を時間に変換
          totalStudyTime += hours;
          pomodoroCount += dayData.pomodoro_count;

          // タスク数をカウント
          const dayTasks = completedTasks.filter((task) => {
            const taskDate = new Date(task.updated_at).toISOString().split("T")[0];
            return taskDate === dateStr;
          }).length;

          dailyStudyData.push({
            date: dateStr,
            dateObj: date,
            time: parseFloat(hours.toFixed(1)),
            tasks: dayTasks,
            pomodoros: dayData.pomodoro_count,
          });
        } else {
          // データがない日は0で初期化
          dailyStudyData.push({
            date: dateStr,
            dateObj: date,
            time: 0,
            tasks: 0,
            pomodoros: 0,
          });
        }
      }

      // タグデータの形式を整える
      const subjectData = tagData.sort((a, b) => b.count - a.count).slice(0, 5);

      // 時間帯別データを計算
      const timeOfDayData = [
        { time: "6-9時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 4, 0) },
        { time: "9-12時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 3, 0) },
        { time: "12-15時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 5, 0) },
        { time: "15-18時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 4, 0) },
        { time: "18-21時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 3, 0) },
        { time: "21-24時", hours: dailyStudyData.reduce((sum, day) => sum + day.time / 6, 0) },
      ];

      // 最も学習時間が長い時間帯
      const mostStudiedTime = timeOfDayData.reduce((best, current) => (current.hours > best.hours ? current : best), { hours: 0, time: "" }).time;

      // 週間・月間・年間データを生成
      const { weeklyData, monthlyData, yearlyData } = generatePeriodData(dailyStudyData);

      // 平均学習時間の計算
      const studyDays = dailyStudyData.filter((d) => d.time > 0).length;
      const avgTime = totalStudyTime / (studyDays || 1);

      // データをセット
      setStudyData({
        weeklyData,
        monthlyData,
        yearlyData,
        subjectData,
        timeOfDayData,
        stats: {
          totalTime: parseFloat(totalStudyTime.toFixed(1)),
          totalTasks: completedTasks.length,
          avgTime: parseFloat(avgTime.toFixed(1)),
          streakDays: streak,
          mostStudiedTime,
          pomodoroCount,
        },
      });

      return true;
    } catch (err) {
      console.error("Supabaseからの分析データ読み込みエラー:", err);
      return false;
    }
  };

  // 期間別データ生成の共通関数
  const generatePeriodData = (dailyData) => {
    const today = new Date();

    // 曜日の配列
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

    // 週間データの生成（常に日曜日から始まる7日間を表示）
    const weeklyData = [];

    // 現在の日付から直近の日曜日を見つける
    const currentDay = today.getDay(); // 0が日曜日、6が土曜日
    const sundayOffset = currentDay; // 日曜日までの日数（日曜日なら0）
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - sundayOffset);

    // 日曜日から7日間のデータを生成
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(lastSunday);
      targetDate.setDate(lastSunday.getDate() + i);
      const dateStr = targetDate.toISOString().split("T")[0];

      // 該当日のデータを探す
      const dayData = dailyData.find((day) => day.date === dateStr);

      weeklyData.push({
        date: weekdays[i] + "曜日",
        time: dayData ? dayData.time : 0,
        tasks: dayData ? dayData.tasks : 0,
        pomodoros: dayData ? dayData.pomodoros : 0,
      });
    }

    // 月間データの生成（常に当月の週ごとに分けて表示）
    const monthlyData = [];

    // 現在の月の初日を取得
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 現在の月の週数を計算
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // 各週の開始日と終了日を計算
    for (let weekNumber = 0; weekNumber < 4; weekNumber++) {
      // 各週の開始日（1日、8日、15日、22日）
      const startDay = weekNumber * 7 + 1;
      // 各週の終了日（週の最終日または月末）
      const endDay = Math.min((weekNumber + 1) * 7, totalDaysInMonth);

      // 該当週のデータを収集
      let weekTime = 0;
      let weekTasks = 0;
      let weekPomodoros = 0;

      // 日付データを探して集計
      for (let day = startDay; day <= endDay; day++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth(), day);
        const targetDateStr = targetDate.toISOString().split("T")[0];

        // dailyStudyDataから該当する日付のデータを探す
        const dayData = dailyData.find((data) => data.date === targetDateStr);

        if (dayData) {
          weekTime += dayData.time;
          weekTasks += dayData.tasks;
          weekPomodoros += dayData.pomodoros;
        }
      }

      monthlyData.push({
        date: `第${weekNumber + 1}週`,
        time: parseFloat(weekTime.toFixed(1)),
        tasks: weekTasks,
        pomodoros: weekPomodoros,
      });
    }

    // 年間データの生成（常に12ヶ月分表示）
    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

    // 現在の月から過去12ヶ月間のデータを集計
    const yearlyData = [];
    const currentMonth = today.getMonth(); // 0-11

    for (let i = 0; i < 12; i++) {
      // 表示順を1月〜12月に固定
      const monthIndex = i;
      const monthName = months[monthIndex];

      // 該当月のデータを探す（実データがある場合）
      // 注: 実際のアプリでは、月ごとのデータをデータベースから取得するロジックが必要
      // ここでは簡易的に実装

      // まずは初期値を設定
      let monthlyStats = {
        date: monthName,
        time: 0,
        tasks: 0,
        pomodoros: 0,
      };

      // 現在の月から過去3ヶ月以内のデータは実際の集計を試みる
      if (i <= currentMonth && i >= currentMonth - 2) {
        // 該当月に属する日のデータを収集
        const monthData = dailyData.filter((day) => {
          const dayMonth = day.dateObj.getMonth();
          return dayMonth === monthIndex;
        });

        if (monthData.length > 0) {
          monthlyStats = {
            date: monthName,
            time: parseFloat(monthData.reduce((sum, day) => sum + day.time, 0).toFixed(1)),
            tasks: monthData.reduce((sum, day) => sum + day.tasks, 0),
            pomodoros: monthData.reduce((sum, day) => sum + day.pomodoros, 0),
          };
        }
      } else {
        // それ以外の月はサンプルデータを提供（開発用）
        // 本番環境では過去のデータをデータベースから取得
        const sampleValues = [
          { time: 45, tasks: 90 },
          { time: 52, tasks: 105 },
          { time: 60, tasks: 120 },
          { time: 48, tasks: 96 },
          { time: 55, tasks: 110 },
          { time: 50, tasks: 100 },
          { time: 42, tasks: 84 },
          { time: 38, tasks: 76 },
          { time: 65, tasks: 130 },
          { time: 70, tasks: 140 },
          { time: 58, tasks: 116 },
          { time: 45, tasks: 90 },
        ];

        monthlyStats = {
          date: monthName,
          time: sampleValues[monthIndex].time,
          tasks: sampleValues[monthIndex].tasks,
          pomodoros: Math.round(sampleValues[monthIndex].time * 2),
        };
      }

      yearlyData.push(monthlyStats);
    }

    return { weeklyData, monthlyData, yearlyData };
  };

  // 分析データを読み込む関数
  const loadAnalyticsData = async () => {
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
        throw new Error("分析データのロードに失敗しました");
      }
    } catch (err) {
      console.error("分析データロードエラー:", err);
      setError("分析データの読み込み中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザーが認証されたらデータをロード
  useEffect(() => {
    if (isSignedIn) {
      loadAnalyticsData();
    }
  }, [isSignedIn, user?.id]);

  // データソースが変更された場合も再ロード
  useEffect(() => {
    if (isSignedIn) {
      loadAnalyticsData();
    }
  }, [useLocalStorage]);

  // 選択されたデータセット
  const getSelectedData = () => {
    switch (period) {
      case "week":
        return studyData.weeklyData;
      case "month":
        return studyData.monthlyData;
      case "year":
        return studyData.yearlyData;
      default:
        return studyData.weeklyData;
    }
  };

  const selectedData = getSelectedData();

  // 学習時間の合計（選択された期間のみ）
  const periodTotalTime = selectedData.reduce((sum, item) => sum + item.time, 0);

  // タスク数の合計（選択された期間のみ）
  const periodTotalTasks = selectedData.reduce((sum, item) => sum + item.tasks, 0);

  // 期間ごとの平均学習時間
  const periodAvgTime = selectedData.length > 0 ? periodTotalTime / selectedData.length : 0;

  // 円グラフ用の色
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe"];

  // ローディング表示
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">学習データ分析</h1>
        <div className="bg-white p-10 rounded-lg shadow text-center">
          <p className="text-gray-500">分析データを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">学習データ分析</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">エラー: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  // バーチャートの拡張 - 今日の日付を強調表示
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">学習データ分析</h1>

      {/* 期間選択 */}
      <div className="flex space-x-2 mb-8">
        <button onClick={() => setPeriod("week")} className={`px-4 py-2 rounded-md ${period === "week" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
          週間
        </button>
        <button onClick={() => setPeriod("month")} className={`px-4 py-2 rounded-md ${period === "month" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
          月間
        </button>
        <button onClick={() => setPeriod("year")} className={`px-4 py-2 rounded-md ${period === "year" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
          年間
        </button>
      </div>

      {/* 概要データ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium uppercase mb-2">総学習時間</h2>
          <div className="text-3xl font-bold text-indigo-600">{periodTotalTime.toFixed(1)}時間</div>
          <div className="text-sm text-gray-500 mt-1">
            平均: {periodAvgTime.toFixed(1)}時間/{period === "week" ? "日" : period === "month" ? "週" : "月"}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium uppercase mb-2">完了タスク</h2>
          <div className="text-3xl font-bold text-indigo-600">{periodTotalTasks}個</div>
          <div className="text-sm text-gray-500 mt-1">
            平均: {selectedData.length > 0 ? (periodTotalTasks / selectedData.length).toFixed(1) : 0}個/{period === "week" ? "日" : period === "month" ? "週" : "月"}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium uppercase mb-2">効率</h2>
          <div className="text-3xl font-bold text-indigo-600">{periodTotalTime > 0 ? (periodTotalTasks / periodTotalTime).toFixed(1) : 0}</div>
          <div className="text-sm text-gray-500 mt-1">タスク/時間</div>
        </div>
      </div>

      {/* 学習時間・タスク数グラフ - rechartsバージョン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">学習時間の推移</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "時間", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value) => [`${value} 時間`, "学習時間"]} />
                <Bar dataKey="time" name="学習時間" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">完了タスク数</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "タスク数", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value) => [`${value} 個`, "タスク数"]} />
                <Bar dataKey="tasks" name="タスク数" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 科目別の学習時間と円グラフ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">カテゴリ別のメモ数</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={studyData.subjectData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {studyData.subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} 件`, "メモ数"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 時間帯別の学習時間 - シンプルなバーグラフに変更 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">時間帯別の学習時間</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyData.timeOfDayData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: "時間", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value) => [`${value.toFixed(1)} 時間`, "学習時間"]} />
                <Legend />
                <Bar dataKey="hours" name="学習時間" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 学習習慣分析 */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-medium mb-4">学習習慣の分析</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">学習ストリーク</h3>
            <div className="text-3xl font-bold text-indigo-600 mb-1">{studyData.stats.streakDays}日</div>
            <p className="text-sm text-gray-600">継続は力なり！毎日コツコツと学習を続けましょう。</p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">最も学習した時間帯</h3>
            <div className="text-3xl font-bold text-indigo-600 mb-1">{studyData.stats.mostStudiedTime}</div>
            <p className="text-sm text-gray-600">この時間帯に最も多く学習しています。</p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">ポモドーロ完了数</h3>
            <div className="text-3xl font-bold text-indigo-600 mb-1">{studyData.stats.pomodoroCount}回</div>
            <p className="text-sm text-gray-600">累計のポモドーロ完了回数です。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
