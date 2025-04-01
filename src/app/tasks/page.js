// src/app/tasks/page.js
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export default function Tasks() {
  // タスクの状態
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 新規タスクの状態
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    estimated: "",
    priority: "medium",
    due: "",
    category: "",
  });

  // 編集中のタスク
  const [editingTask, setEditingTask] = useState(null);

  // UIの状態
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'completed'
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // 認証情報
  const { isSignedIn, user } = useUser();

  // ローカルストレージからタスクをロードする関数
  const loadTasks = () => {
    if (typeof window === "undefined") return;

    setIsLoading(true);
    setError(null);

    try {
      const userId = user?.id || "guest";
      const storageKey = `tasks_${userId}`;
      const storedTasks = localStorage.getItem(storageKey);

      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error("Error loading tasks from localStorage:", err);
      setError("タスクの読み込み中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // ローカルストレージにタスクを保存する関数
  const saveTasks = (tasksToSave) => {
    if (typeof window === "undefined") return;

    try {
      const userId = user?.id || "guest";
      const storageKey = `tasks_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(tasksToSave));
    } catch (err) {
      console.error("Error saving tasks to localStorage:", err);
      setError("タスクの保存中にエラーが発生しました");
    }
  };

  // ユーザーが認証されたらタスクをロード
  useEffect(() => {
    if (isSignedIn) {
      loadTasks();
    }
  }, [isSignedIn, user?.id]);

  // タスクが変更されたらローカルストレージに保存
  useEffect(() => {
    if (tasks.length > 0 || isLoading === false) {
      saveTasks(tasks);
    }
  }, [tasks]);

  // タスク追加処理
  const handleAddTask = (e) => {
    e.preventDefault();

    try {
      const newTaskWithId = {
        id: Date.now().toString(), // 一意のID
        ...newTask,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedTasks = [...tasks, newTaskWithId];
      setTasks(updatedTasks);

      // フォームをリセット
      setNewTask({
        title: "",
        description: "",
        estimated: "",
        priority: "medium",
        due: "",
        category: "",
      });
      setShowAddForm(false);
    } catch (err) {
      console.error("Error adding task:", err);
      setError("タスクの追加中にエラーが発生しました");
    }
  };

  // タスク更新処理
  const handleUpdateTask = (e) => {
    e.preventDefault();

    if (!editingTask) return;

    try {
      const updatedTask = {
        ...editingTask,
        updated_at: new Date().toISOString(),
      };

      // タスクリストを更新
      const updatedTasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));

      setTasks(updatedTasks);

      // 編集モードを終了
      setEditingTask(null);
      setShowEditForm(false);
    } catch (err) {
      console.error("Error updating task:", err);
      setError("タスクの更新中にエラーが発生しました");
    }
  };

  // タスク削除処理
  const handleDeleteTask = (taskId) => {
    if (!confirm("このタスクを削除してもよろしいですか？")) {
      return;
    }

    try {
      // 削除したタスクをリストから除外
      const updatedTasks = tasks.filter((task) => task.id !== taskId);
      setTasks(updatedTasks);
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("タスクの削除中にエラーが発生しました");
    }
  };

  // タスク完了状態の切り替え
  const handleToggleComplete = (taskId) => {
    try {
      // タスク完了状態を反転
      const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed, updated_at: new Date().toISOString() } : task));

      setTasks(updatedTasks);
    } catch (err) {
      console.error("Error toggling task completion:", err);
      setError("タスクの更新中にエラーが発生しました");
    }
  };

  // タスクの編集を開始
  const startEditingTask = (task) => {
    setEditingTask({ ...task });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  // フィルター適用
  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  // 優先度に対応する色を返す関数
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 優先度に対応する日本語を返す関数
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return "";
    }
  };

  // 日付をフォーマットする関数
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

  // ローディング表示
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">勉強タスク管理</h1>
        <div className="bg-white p-10 rounded-lg shadow text-center">
          <p className="text-gray-500">タスクを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">勉強タスク管理</h1>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowEditForm(false);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          {showAddForm ? "キャンセル" : "新規タスク"}
        </button>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">エラー: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* 新規タスク追加フォーム */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-medium mb-4">新規タスクの追加</h2>
          <form onSubmit={handleAddTask}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル*</label>
                <input type="text" required value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="タスクのタイトル" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                <input type="text" value={newTask.category} onChange={(e) => setNewTask({ ...newTask, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="例: 数学、英語、物理" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">予定時間</label>
                <input type="text" value={newTask.estimated} onChange={(e) => setNewTask({ ...newTask, estimated: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="例: 30分、1時間" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">期日</label>
                <input type="date" value={newTask.due} onChange={(e) => setNewTask({ ...newTask, due: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows="3" placeholder="タスクの詳細"></textarea>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-700 mr-2">
                キャンセル
              </button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                追加する
              </button>
            </div>
          </form>
        </div>
      )}

      {/* タスク編集フォーム */}
      {showEditForm && editingTask && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-medium mb-4">タスクの編集</h2>
          <form onSubmit={handleUpdateTask}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル*</label>
                <input type="text" required value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="タスクのタイトル" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                <input type="text" value={editingTask.category} onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="例: 数学、英語、物理" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">予定時間</label>
                <input type="text" value={editingTask.estimated} onChange={(e) => setEditingTask({ ...editingTask, estimated: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="例: 30分、1時間" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">期日</label>
                <input type="date" value={editingTask.due} onChange={(e) => setEditingTask({ ...editingTask, due: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                <select value={editingTask.priority} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状態</label>
                <select
                  value={editingTask.completed ? "completed" : "active"}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      completed: e.target.value === "completed",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="active">未完了</option>
                  <option value="completed">完了</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <textarea value={editingTask.description} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows="3" placeholder="タスクの詳細"></textarea>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setShowEditForm(false);
                }}
                className="px-4 py-2 text-gray-700 mr-2"
              >
                キャンセル
              </button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                更新する
              </button>
            </div>
          </form>
        </div>
      )}

      {/* フィルタボタン */}
      <div className="flex space-x-2 mb-4">
        <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-md ${filter === "all" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
          すべて
        </button>
        <button onClick={() => setFilter("active")} className={`px-4 py-2 rounded-md ${filter === "active" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
          未完了
        </button>
        <button onClick={() => setFilter("completed")} className={`px-4 py-2 rounded-md ${filter === "completed" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
          完了済み
        </button>
      </div>

      {/* タスクリスト */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">タスクがありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タスク
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  予定時間
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期日
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  優先度
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状態
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className={task.completed ? "bg-gray-50" : ""}>
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <input type="checkbox" checked={task.completed} onChange={() => handleToggleComplete(task.id)} className="mt-1 mr-3" />
                      <div>
                        <div className={`font-medium ${task.completed ? "line-through text-gray-500" : "text-gray-900"}`}>{task.title}</div>
                        {task.description && <div className="text-sm text-gray-500 mt-1">{task.description}</div>}
                        {task.updated_at && <div className="text-xs text-gray-400 mt-1">{getRelativeTimeString(task.updated_at)}に更新</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{task.category && <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">{task.category}</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.estimated}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.due ? formatDate(task.due) : ""}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>{getPriorityLabel(task.priority)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${task.completed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{task.completed ? "完了" : "進行中"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => startEditingTask(task)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                      編集
                    </button>
                    <button onClick={() => handleDeleteTask(task.id)} className="text-red-600 hover:text-red-900">
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
