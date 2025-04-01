// src/app/page.js
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <div className="text-center max-w-3xl px-4">
        <h1 className="text-4xl font-bold text-indigo-600 mb-6">StudyTracker</h1>
        <p className="text-2xl text-gray-700 mb-8">効率的に勉強を管理し、学習習慣を向上させるアプリ</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">✓</div>
            <h2 className="text-xl font-semibold mb-2">タスク管理</h2>
            <p className="text-gray-600">勉強タスクを整理し、優先順位をつけて効率的に学習を進めましょう</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">⏱️</div>
            <h2 className="text-xl font-semibold mb-2">ポモドーロタイマー</h2>
            <p className="text-gray-600">集中力を高めるポモドーロ技法で効率的に勉強時間を管理</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">📝</div>
            <h2 className="text-xl font-semibold mb-2">メモ機能</h2>
            <p className="text-gray-600">学んだことを記録し、いつでも振り返ることができます</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">📈</div>
            <h2 className="text-xl font-semibold mb-2">進捗分析</h2>
            <p className="text-gray-600">学習データを可視化して自分の成長を実感しましょう</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup" className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors">
            無料で始める
          </Link>
          <Link href="/auth/login" className="px-8 py-3 border border-indigo-600 text-indigo-600 font-medium rounded-md hover:bg-indigo-50 transition-colors">
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
