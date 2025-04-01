// src/app/rewards/page.js
"use client";

import { useState } from "react";

export default function Rewards() {
  // ユーザーのポイントとレベル
  const [points, setPoints] = useState(1250);
  const [level, setLevel] = useState(8);

  // 達成済みのバッジ
  const [earnedBadges, setEarnedBadges] = useState([
    {
      id: 1,
      name: "学習スタート",
      description: "初めての学習セッションを完了",
      icon: "🚀",
      earned: true,
      date: "2025-03-01T10:00:00Z",
    },
    {
      id: 2,
      name: "5日連続",
      description: "5日連続で学習を継続",
      icon: "🔥",
      earned: true,
      date: "2025-03-05T15:30:00Z",
    },
    {
      id: 3,
      name: "10日連続",
      description: "10日連続で学習を継続",
      icon: "⚡",
      earned: true,
      date: "2025-03-10T14:45:00Z",
    },
    {
      id: 4,
      name: "25ポモドーロ",
      description: "25回のポモドーロを完了",
      icon: "⏱️",
      earned: true,
      date: "2025-03-12T20:15:00Z",
    },
    {
      id: 5,
      name: "50ポモドーロ",
      description: "50回のポモドーロを完了",
      icon: "⏱️⏱️",
      earned: true,
      date: "2025-03-18T19:30:00Z",
    },
    {
      id: 6,
      name: "10タスク完了",
      description: "10個のタスクを完了",
      icon: "✅",
      earned: true,
      date: "2025-03-08T16:20:00Z",
    },
    {
      id: 7,
      name: "20時間達成",
      description: "合計20時間の学習を達成",
      icon: "🕐",
      earned: true,
      date: "2025-03-15T12:10:00Z",
    },
    {
      id: 8,
      name: "ノートマスター",
      description: "10個以上のメモを作成",
      icon: "📝",
      earned: true,
      date: "2025-03-20T11:40:00Z",
    },
  ]);

  // 次に獲得できるバッジ
  const [upcomingBadges, setUpcomingBadges] = useState([
    {
      id: 9,
      name: "30日連続",
      description: "30日連続で学習を継続",
      icon: "🔥🔥",
      progress: 15,
      total: 30,
    },
    {
      id: 10,
      name: "100ポモドーロ",
      description: "100回のポモドーロを完了",
      icon: "⏱️⏱️⏱️",
      progress: 65,
      total: 100,
    },
    {
      id: 11,
      name: "50タスク完了",
      description: "50個のタスクを完了",
      icon: "✅✅",
      progress: 35,
      total: 50,
    },
    {
      id: 12,
      name: "50時間達成",
      description: "合計50時間の学習を達成",
      icon: "🕐🕐",
      progress: 32,
      total: 50,
    },
  ]);

  // 学習マイルストーン
  const [milestones, setMilestones] = useState([
    {
      id: 1,
      name: "レベル5達成",
      description: "レベル5に到達",
      reward: "カスタムテーマの解除",
      completed: true,
      date: "2025-03-07T09:20:00Z",
    },
    {
      id: 2,
      name: "レベル10達成",
      description: "レベル10に到達",
      reward: "高度な分析機能の解除",
      completed: false,
      progress: 80, // パーセント
    },
    {
      id: 3,
      name: "100時間学習",
      description: "累計100時間の学習",
      reward: "プレミアムテンプレートの解除",
      completed: false,
      progress: 40, // パーセント
    },
  ]);

  // リワードの交換アイテム
  const [rewardItems, setRewardItems] = useState([
    {
      id: 1,
      name: "カスタムアバター",
      description: "プロフィールにカスタムアバターを設定できます",
      points: 500,
      icon: "👤",
    },
    {
      id: 2,
      name: "ダークモード",
      description: "アプリをダークモードで使用できます",
      points: 800,
      icon: "🌙",
    },
    {
      id: 3,
      name: "テーマカラー変更",
      description: "アプリのテーマカラーを変更できます",
      points: 1000,
      icon: "🎨",
    },
    {
      id: 4,
      name: "カスタムサウンド",
      description: "ポモドーロタイマーのカスタムサウンドを使用できます",
      points: 1200,
      icon: "🔊",
    },
    {
      id: 5,
      name: "高度な統計",
      description: "詳細な学習統計と分析を表示します",
      points: 1500,
      icon: "📊",
    },
  ]);

  // 日付のフォーマット
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // リワードアイテムの購入
  const purchaseReward = (itemId) => {
    const item = rewardItems.find((item) => item.id === itemId);
    if (item && points >= item.points) {
      setPoints(points - item.points);
      // 実際のアプリでは、ここでユーザーにリワードを付与する処理を行う
      alert(`${item.name}を獲得しました！`);
    } else {
      alert("ポイントが足りません");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">リワードシステム</h1>

      {/* プロフィールとレベル情報 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl">{level}</div>

          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">レベル {level} - 学習者</h2>
            <div className="text-sm text-gray-600 mb-2">次のレベルまであと {2000 - (points % 2000)} ポイント</div>

            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(points % 2000) / 20}%` }}></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>{points % 2000} / 2000 ポイント</span>
              <span>レベル {level + 1}</span>
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-1">{points}</div>
            <div className="text-sm text-gray-600">合計ポイント</div>
          </div>
        </div>
      </div>

      {/* バッジコレクション */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">バッジコレクション</h2>

        <h3 className="font-medium text-gray-700 mb-2">獲得済みバッジ</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
          {earnedBadges.map((badge) => (
            <div key={badge.id} className="border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
              <div className="text-3xl mb-2">{badge.icon}</div>
              <h4 className="font-medium mb-1">{badge.name}</h4>
              <p className="text-xs text-gray-600 mb-2">{badge.description}</p>
              <div className="text-xs text-indigo-600">{formatDate(badge.date)}に獲得</div>
            </div>
          ))}
        </div>

        <h3 className="font-medium text-gray-700 mb-2">次の目標</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {upcomingBadges.map((badge) => (
            <div key={badge.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl opacity-50">{badge.icon}</div>
                <div>
                  <h4 className="font-medium">{badge.name}</h4>
                  <p className="text-xs text-gray-600">{badge.description}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(badge.progress / badge.total) * 100}%` }}></div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                {badge.progress} / {badge.total}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* マイルストーン */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">学習マイルストーン</h2>

        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div key={milestone.id} className={`border rounded-lg p-4 ${milestone.completed ? "bg-green-50 border-green-200" : ""}`}>
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <div className="flex-1">
                  <h4 className="font-medium flex items-center">
                    {milestone.completed && <span className="text-green-500 mr-2">✓</span>}
                    {milestone.name}
                  </h4>
                  <p className="text-sm text-gray-600">{milestone.description}</p>
                </div>
                <div className="text-right">
                  <div className="font-medium text-indigo-600">報酬:</div>
                  <div className="text-sm">{milestone.reward}</div>
                </div>
              </div>

              {!milestone.completed && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${milestone.progress}%` }}></div>
                  </div>
                  <div className="text-xs text-gray-500 text-right">{milestone.progress}% 完了</div>
                </>
              )}

              {milestone.completed && <div className="text-xs text-green-600">{formatDate(milestone.date)}に達成</div>}
            </div>
          ))}
        </div>
      </div>

      {/* リワード交換 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">リワード交換</h2>
          <div className="text-lg font-medium text-indigo-600">所持ポイント: {points}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {rewardItems.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">{item.icon}</div>
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="font-medium text-indigo-600">{item.points}ポイント</div>
                <button onClick={() => purchaseReward(item.id)} disabled={points < item.points} className={`px-3 py-1 rounded-md text-sm ${points >= item.points ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>
                  交換する
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
