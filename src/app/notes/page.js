// src/app/notes/page.js
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { noteService } from "@/lib/supabase";

export default function Notes() {
  // メモの状態
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useLocalStorage, setUseLocalStorage] = useState(false); // フォールバック用

  // 新規メモの状態
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    tags: "",
  });

  // UI状態
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // 認証情報
  const { isSignedIn, user } = useUser();

  // ローカルストレージからメモをロードする関数（フォールバック用）
  const loadFromLocalStorage = () => {
    if (typeof window === "undefined") return;

    try {
      console.log("ローカルストレージからメモをロード中");
      const userId = user?.id || "guest";
      const storageKey = `notes_${userId}`;
      const storedNotes = localStorage.getItem(storageKey);

      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      } else {
        setNotes([]);
      }
      return true;
    } catch (err) {
      console.error("ローカルストレージからのメモ読み込みエラー:", err);
      return false;
    }
  };

  // ローカルストレージにメモを保存する関数（フォールバック用）
  const saveToLocalStorage = (notesToSave) => {
    if (typeof window === "undefined") return;

    try {
      const userId = user?.id || "guest";
      const storageKey = `notes_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(notesToSave));
      return true;
    } catch (err) {
      console.error("ローカルストレージへのメモ保存エラー:", err);
      return false;
    }
  };

  // Supabaseからメモをロードする関数
  const loadFromSupabase = async () => {
    try {
      console.log("Supabaseからメモをロード中");
      const data = await noteService.getUserNotes(user.id);
      setNotes(data);
      return true;
    } catch (err) {
      console.error("Supabaseからのメモ読み込みエラー:", err);
      return false;
    }
  };

  // メモをロードする関数
  const loadNotes = async () => {
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
          success = loadFromLocalStorage();
        }
      } else {
        // ローカルストレージからロード
        success = loadFromLocalStorage();
      }

      if (!success) {
        throw new Error("メモのロードに失敗しました");
      }
    } catch (err) {
      console.error("メモロードエラー:", err);
      setError("メモの読み込み中にエラーが発生しました");
      setNotes([]); // 最低限空の配列を設定
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザーが認証されたらメモをロード
  useEffect(() => {
    if (isSignedIn) {
      loadNotes();
    }
  }, [isSignedIn, user?.id]);

  // データソースが変更された場合も再ロード
  useEffect(() => {
    if (isSignedIn) {
      loadNotes();
    }
  }, [useLocalStorage]);

  // メモ追加処理
  const handleAddNote = async (e) => {
    e.preventDefault();

    try {
      const tags = newNote.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      if (useLocalStorage) {
        // ローカルストレージに保存
        const newNoteWithId = {
          id: Date.now().toString(),
          title: newNote.title,
          content: newNote.content,
          tags: tags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedNotes = [newNoteWithId, ...notes];
        setNotes(updatedNotes);
        saveToLocalStorage(updatedNotes);
      } else {
        // Supabaseに保存
        const noteData = {
          title: newNote.title,
          content: newNote.content,
          tags: tags,
        };

        const createdNote = await noteService.createNote(user.id, noteData);
        setNotes([createdNote, ...notes]);
      }

      // フォームをリセット
      setNewNote({
        title: "",
        content: "",
        tags: "",
      });
      setShowAddForm(false);
    } catch (err) {
      console.error("メモ追加エラー:", err);
      setError("メモの追加中にエラーが発生しました");
    }
  };

  // メモ更新処理
  const handleUpdateNote = async (e) => {
    e.preventDefault();

    if (!selectedNote) return;

    try {
      const tags = newNote.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      if (useLocalStorage) {
        // ローカルストレージで更新
        const updatedNote = {
          ...selectedNote,
          title: newNote.title,
          content: newNote.content,
          tags: tags,
          updatedAt: new Date().toISOString(),
        };

        // メモリストを更新
        const updatedNotes = notes.map((note) => (note.id === updatedNote.id ? updatedNote : note));
        setNotes(updatedNotes);
        saveToLocalStorage(updatedNotes);

        // 選択中のメモも更新
        setSelectedNote(updatedNote);
      } else {
        // Supabaseで更新
        const noteData = {
          title: newNote.title,
          content: newNote.content,
          tags: tags,
        };

        const updatedNote = await noteService.updateNote(user.id, selectedNote.id, noteData);

        // メモリストを更新
        const updatedNotes = notes.map((note) => (note.id === updatedNote.id ? updatedNote : note));
        setNotes(updatedNotes);

        // 選択中のメモも更新
        setSelectedNote(updatedNote);
      }

      // 編集モードを終了
      setEditMode(false);
    } catch (err) {
      console.error("メモ更新エラー:", err);
      setError("メモの更新中にエラーが発生しました");
    }
  };

  // メモ削除処理
  const handleDeleteNote = async (noteId) => {
    if (!confirm("このメモを削除してもよろしいですか？")) {
      return;
    }

    try {
      if (useLocalStorage) {
        // ローカルストレージから削除
        const updatedNotes = notes.filter((note) => note.id !== noteId);
        setNotes(updatedNotes);
        saveToLocalStorage(updatedNotes);
      } else {
        // Supabaseから削除
        await noteService.deleteNote(user.id, noteId);
        const updatedNotes = notes.filter((note) => note.id !== noteId);
        setNotes(updatedNotes);
      }

      // 削除したメモが選択中だった場合、選択解除
      if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error("メモ削除エラー:", err);
      setError("メモの削除中にエラーが発生しました");
    }
  };

  // メモの編集を開始
  const startEditingNote = () => {
    if (!selectedNote) return;

    setNewNote({
      title: selectedNote.title,
      content: selectedNote.content,
      tags: selectedNote.tags.join(", "),
    });
    setEditMode(true);
  };

  // 検索とフィルタリング
  const filteredNotes = notes.filter((note) => {
    const search = searchTerm.toLowerCase();
    return note.title.toLowerCase().includes(search) || note.content.toLowerCase().includes(search) || note.tags.some((tag) => tag.toLowerCase().includes(search));
  });

  // 日付をフォーマットする関数
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // マークダウンの簡易レンダリング
  const renderMarkdown = (text) => {
    // 見出し
    let html = text.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold my-4">$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold my-3">$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold my-2">$1</h3>');

    // リスト
    html = html.replace(/^\d+\. (.*$)/gm, '<li class="ml-5 list-decimal">$1</li>');
    html = html.replace(/^- (.*$)/gm, '<li class="ml-5 list-disc">$1</li>');

    // 段落
    html = html.replace(/^(?!<h|<li)(.*$)/gm, function (match) {
      return match.trim() ? '<p class="my-2">' + match + "</p>" : "<br>";
    });

    // コードブロック（簡易）
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 my-3 rounded overflow-x-auto"><code>$1</code></pre>');

    // テーブル（簡易）
    if (html.includes("|")) {
      const lines = html.split("\n");
      let tableHTML = '<div class="overflow-x-auto my-4"><table class="min-w-full border border-gray-300">';
      let inTable = false;

      for (let line of lines) {
        if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
          if (!inTable) {
            inTable = true;
            tableHTML += "<thead><tr>";

            // ヘッダー行
            const headerCells = line.split("|").filter((cell) => cell.trim() !== "");
            for (let cell of headerCells) {
              tableHTML += `<th class="px-4 py-2 border border-gray-300 bg-gray-100">${cell.trim()}</th>`;
            }
            tableHTML += "</tr></thead><tbody>";
          } else if (line.includes("---")) {
            // 区切り行はスキップ
            continue;
          } else {
            // データ行
            tableHTML += "<tr>";
            const cells = line.split("|").filter((cell) => cell.trim() !== "");
            for (let cell of cells) {
              tableHTML += `<td class="px-4 py-2 border border-gray-300">${cell.trim()}</td>`;
            }
            tableHTML += "</tr>";
          }
        } else if (inTable) {
          inTable = false;
          tableHTML += "</tbody></table></div>";
          // テーブル以外の内容を追加
          if (!line.includes("<")) {
            tableHTML += line;
          }
        }
      }

      if (inTable) {
        tableHTML += "</tbody></table></div>";
      }

      // テーブル部分だけ置換
      const tableStart = html.indexOf("|");
      const tableEnd = html.lastIndexOf("|");
      if (tableStart !== -1 && tableEnd !== -1) {
        const beforeTable = html.substring(0, tableStart);
        const afterTable = html.substring(tableEnd + 1);
        html = beforeTable + tableHTML + afterTable;
      }
    }

    return html;
  };

  // ローディング表示
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">学習メモ</h1>
        <div className="bg-white p-10 rounded-lg shadow text-center">
          <p className="text-gray-500">メモを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">学習メモ</h1>
        <button
          onClick={() => {
            setSelectedNote(null);
            setShowAddForm(!showAddForm);
            setEditMode(false);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          {showAddForm ? "キャンセル" : "新規メモ"}
        </button>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">エラー: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* 検索バー */}
      <div className="mb-6">
        <div className="relative">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-md" placeholder="メモを検索..." />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* メモリスト */}
        <div className={`w-full ${selectedNote || showAddForm ? "md:w-1/3" : "md:w-full"}`}>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-gray-500">メモが見つかりません</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredNotes.map((note) => (
                  <li
                    key={note.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedNote?.id === note.id ? "bg-indigo-50" : ""}`}
                    onClick={() => {
                      setSelectedNote(note);
                      setShowAddForm(false);
                      setEditMode(false);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{note.title}</h3>
                        <span className="text-xs text-gray-500">{formatDate(note.updatedAt || note.updated_at)}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600 line-clamp-2">{note.content.split("\n")[0].replace(/^#+ /, "")}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {note.tags.map((tag, index) => (
                          <span key={index} className="inline-block px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* メモ追加/編集フォーム */}
        {showAddForm && (
          <div className="w-full md:w-2/3">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-medium mb-4">新規メモ</h2>
              <form onSubmit={handleAddNote}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイトル*</label>
                  <input type="text" required value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="メモのタイトル" />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">内容* (マークダウン対応)</label>
                  <textarea
                    required
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                    rows="12"
                    placeholder="# 見出し1&#10;## 見出し2&#10;- リスト項目&#10;1. 番号付きリスト&#10;```&#10;コードブロック&#10;```"
                  ></textarea>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">タグ (カンマ区切り)</label>
                  <input type="text" value={newNote.tags} onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="数学, 英語, プログラミング" />
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-700 mr-2">
                    キャンセル
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    保存する
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* メモ編集フォーム */}
        {selectedNote && editMode && (
          <div className="w-full md:w-2/3">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-medium mb-4">メモの編集</h2>
              <form onSubmit={handleUpdateNote}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイトル*</label>
                  <input type="text" required value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="メモのタイトル" />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">内容* (マークダウン対応)</label>
                  <textarea
                    required
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                    rows="12"
                    placeholder="# 見出し1&#10;## 見出し2&#10;- リスト項目&#10;1. 番号付きリスト&#10;```&#10;コードブロック&#10;```"
                  ></textarea>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">タグ (カンマ区切り)</label>
                  <input type="text" value={newNote.tags} onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="数学, 英語, プログラミング" />
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 text-gray-700 mr-2">
                    キャンセル
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    更新する
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* メモ詳細 */}
        {selectedNote && !editMode && (
          <div className="w-full md:w-2/3">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedNote.title}</h2>
                <div className="text-sm text-gray-500">
                  <div>作成: {formatDate(selectedNote.createdAt || selectedNote.created_at)}</div>
                  <div>更新: {formatDate(selectedNote.updatedAt || selectedNote.updated_at)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {selectedNote.tags.map((tag, index) => (
                  <span key={index} className="inline-block px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="prose prose-indigo max-w-none border-t pt-4">
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content) }} />
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => handleDeleteNote(selectedNote.id)} className="px-4 py-2 text-red-600 hover:text-red-800 mr-2">
                  削除
                </button>
                <button onClick={startEditingNote} className="px-4 py-2 text-indigo-600 hover:text-indigo-800 mr-2">
                  編集
                </button>
                <button onClick={() => setSelectedNote(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
