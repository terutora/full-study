# StudyTracker - 勉強管理アプリ

効率的に勉強の進捗を追跡し、学習習慣を向上させるためのWebアプリケーションです。

![image](https://portfolio-project-five-sandy.vercel.app/images/fullstudy.png)

## 機能

- **ポモドーロタイマー**: 25分の集中と5分の休憩を繰り返すことで効率的に学習できます
- **タスク管理**: 学習タスクを整理し、優先順位をつけて効率的に学習を進められます
- **メモ機能**: 学んだことをマークダウン形式で記録・管理できます
- **進捗分析**: 学習データをグラフで可視化し、自分の成長を実感できます
- **リワードシステム**: 学習のモチベーションを維持するためのゲーミフィケーション機能

## 技術スタック

- **フロントエンド**: React 19.0.0, Next.js 15.2.3
- **認証**: Clerk
- **データベース**: Supabase
- **スタイリング**: TailwindCSS 4
- **グラフ表示**: Recharts 2.15.1

## セットアップ

### 前提条件

- Node.js (18.x以上)
- npm または yarn, pnpm, bun

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/study-tracker.git
cd study-tracker

# 依存関係のインストール
npm install
# または
yarn install
# または
pnpm install
# または
bun install
```

### 環境変数の設定

`.env.local` ファイルをプロジェクトのルートに作成し、以下の環境変数を設定してください：

```
# Clerk認証
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### データベースのセットアップ

Supabaseでプロジェクトを作成し、`supabase/migrations/00001_create_tables.sql` に記載されているSQLを実行してテーブルを作成してください。

### 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと、アプリケーションが表示されます。

## 使い方

1. アカウント登録またはログインします
2. ダッシュボードから各機能にアクセスできます
3. **タイマー**: ポモドーロタイマーで集中学習
4. **タスク**: 学習タスクの作成・管理
5. **メモ**: 学習内容のメモ作成
6. **分析**: 学習データの可視化・分析

## 機能詳細

### ポモドーロタイマー
- 25分の集中と5分の休憩を交互に行う
- 4回の集中サイクル後に長い休憩（15分）
- カスタマイズ可能な集中時間と休憩時間

### タスク管理
- タスクの追加・編集・削除
- カテゴリ、優先度、期限の設定
- フィルタリング機能（すべて、未完了、完了済み）

### メモ機能
- マークダウン形式でのメモ作成
- タグによる分類
- 検索機能

### 進捗分析
- 日次・週次・月次の学習時間グラフ
- カテゴリ別の学習時間分布
- 学習ストリーク（連続学習日数）の表示

## 開発者向け情報

### ディレクトリ構造

```
study-tracker/
├── public/           # 静的ファイル
├── src/
│   ├── app/          # ページコンポーネント
│   │   ├── api/      # APIルート
│   │   └── ...       # 各ページ
│   ├── components/   # 共通コンポーネント
│   └── lib/          # ユーティリティ関数
├── supabase/         # Supabaseマイグレーション
└── ...
```

### 主要ファイル

- `src/app/timer/page.js`: ポモドーロタイマー機能
- `src/app/tasks/page.js`: タスク管理機能
- `src/app/notes/page.js`: メモ機能
- `src/app/analytics/page.js`: 進捗分析機能
- `src/lib/supabase.js`: Supabaseクライアント設定

## 将来の改善点

- [ ] ダークモードの実装
- [ ] モバイルアプリ版の開発
- [ ] 学習グループ・共有機能の追加
- [ ] 定期的なバックアップ機能
- [ ] AIを活用した学習アドバイス機能

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。



## サポート

質問や問題がある場合は、GitHubのissueを作成してください。
