// src/app/api/notes/route.js
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// ユーザーごとのメモデータを一時的に保存するオブジェクト
// 実際のアプリでは、データベースに保存する
const userNotes = {};

export async function GET(req) {
  try {
    // ユーザー認証を確認
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // ユーザーのメモを取得
    const notes = userNotes[userId] || [];

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "メモの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    // ユーザー認証を確認
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // リクエストからメモデータを取得
    const noteData = await req.json();

    // 必須フィールドの検証
    if (!noteData.title || !noteData.content) {
      return NextResponse.json({ error: "タイトルと内容は必須です" }, { status: 400 });
    }

    // 新しいメモを作成
    const newNote = {
      id: Date.now().toString(), // 一意のID
      title: noteData.title,
      content: noteData.content,
      tags: noteData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // ユーザーのメモ配列を初期化（存在しない場合）
    if (!userNotes[userId]) {
      userNotes[userId] = [];
    }

    // 新しいメモを追加（先頭に）
    userNotes[userId].unshift(newNote);

    return NextResponse.json(newNote);
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "メモの作成に失敗しました" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    // ユーザー認証を確認
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // リクエストからメモデータを取得
    const noteData = await req.json();

    // メモIDの検証
    if (!noteData.id) {
      return NextResponse.json({ error: "メモIDは必須です" }, { status: 400 });
    }

    // ユーザーのメモを取得
    const notes = userNotes[userId] || [];

    // 対象のメモを見つける
    const noteIndex = notes.findIndex((note) => note.id === noteData.id);

    if (noteIndex === -1) {
      return NextResponse.json({ error: "指定されたメモが見つかりません" }, { status: 404 });
    }

    // メモを更新
    const updatedNote = {
      ...notes[noteIndex],
      title: noteData.title || notes[noteIndex].title,
      content: noteData.content || notes[noteIndex].content,
      tags: noteData.tags || notes[noteIndex].tags,
      updatedAt: new Date().toISOString(),
    };

    notes[noteIndex] = updatedNote;

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json({ error: "メモの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    // ユーザー認証を確認
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // URLからメモIDを取得
    const url = new URL(req.url);
    const noteId = url.searchParams.get("id");

    if (!noteId) {
      return NextResponse.json({ error: "メモIDは必須です" }, { status: 400 });
    }

    // ユーザーのメモを取得
    const notes = userNotes[userId] || [];

    // 対象のメモを見つける
    const noteIndex = notes.findIndex((note) => note.id === noteId);

    if (noteIndex === -1) {
      return NextResponse.json({ error: "指定されたメモが見つかりません" }, { status: 404 });
    }

    // メモを削除
    notes.splice(noteIndex, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json({ error: "メモの削除に失敗しました" }, { status: 500 });
  }
}
