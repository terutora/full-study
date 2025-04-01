// src/app/api/tasks/route.js
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// ユーザーごとのタスクデータを一時的に保存するオブジェクト
// 実際のアプリでは、データベースに保存する
const userTasks = {};

export async function GET(req) {
  try {
    // ユーザー認証を確認
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // ユーザーのタスクを取得
    const tasks = userTasks[userId] || [];

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "タスクの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    // ユーザー認証を確認
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // リクエストからタスクデータを取得
    const taskData = await req.json();

    // 必須フィールドの検証
    if (!taskData.title) {
      return NextResponse.json({ error: "タスクタイトルは必須です" }, { status: 400 });
    }

    // 新しいタスクを作成
    const newTask = {
      id: Date.now().toString(), // 一意のID
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

    // ユーザーのタスク配列を初期化（存在しない場合）
    if (!userTasks[userId]) {
      userTasks[userId] = [];
    }

    // 新しいタスクを追加
    userTasks[userId].push(newTask);

    return NextResponse.json(newTask);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "タスクの作成に失敗しました" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    // ユーザー認証を確認
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // リクエストからタスクデータを取得
    const taskData = await req.json();

    // タスクIDの検証
    if (!taskData.id) {
      return NextResponse.json({ error: "タスクIDは必須です" }, { status: 400 });
    }

    // ユーザーのタスクを取得
    const tasks = userTasks[userId] || [];

    // 対象のタスクを見つける
    const taskIndex = tasks.findIndex((task) => task.id === taskData.id);

    if (taskIndex === -1) {
      return NextResponse.json({ error: "指定されたタスクが見つかりません" }, { status: 404 });
    }

    // タスクを更新
    const updatedTask = {
      ...tasks[taskIndex],
      ...taskData,
      updated_at: new Date().toISOString(),
    };

    tasks[taskIndex] = updatedTask;

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "タスクの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    // ユーザー認証を確認
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // URLからタスクIDを取得
    const url = new URL(req.url);
    const taskId = url.searchParams.get("id");

    if (!taskId) {
      return NextResponse.json({ error: "タスクIDは必須です" }, { status: 400 });
    }

    // ユーザーのタスクを取得
    const tasks = userTasks[userId] || [];

    // 対象のタスクを見つける
    const taskIndex = tasks.findIndex((task) => task.id === taskId);

    if (taskIndex === -1) {
      return NextResponse.json({ error: "指定されたタスクが見つかりません" }, { status: 404 });
    }

    // タスクを削除
    tasks.splice(taskIndex, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "タスクの削除に失敗しました" }, { status: 500 });
  }
}
