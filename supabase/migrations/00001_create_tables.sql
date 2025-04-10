-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- timer_data テーブル
CREATE TABLE IF NOT EXISTS timer_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  study_time_seconds INTEGER NOT NULL DEFAULT 0,
  pomodoro_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_timer_data_user_id ON timer_data(user_id);
CREATE INDEX IF NOT EXISTS idx_timer_data_date ON timer_data(date);

-- RLS（行レベルセキュリティ）ポリシー設定
ALTER TABLE timer_data ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（もし存在する場合）
DROP POLICY IF EXISTS "ユーザーは自分のタイマーデータのみ読み取り可能" ON timer_data;
DROP POLICY IF EXISTS "ユーザーは自分のタイマーデータのみ追加可能" ON timer_data;
DROP POLICY IF EXISTS "ユーザーは自分のタイマーデータのみ更新可能" ON timer_data;
DROP POLICY IF EXISTS "ユーザーは自分のタイマーデータのみ削除可能" ON timer_data;

-- **重要な変更**: RLSポリシーを一時的に無効化し、すべてのアクセスを許可
CREATE POLICY "全てのユーザーにタイマーデータ操作を許可" 
  ON timer_data FOR ALL
  USING (true)
  WITH CHECK (true);

-- 注意: これは開発目的のみのポリシーです。本番環境では以下のようなより制限的なポリシーを使用してください
/*
-- 認証済みユーザーが自分のデータのみ読み取り可能
CREATE POLICY "ユーザーは自分のタイマーデータのみ読み取り可能" 
  ON timer_data FOR SELECT 
  USING (auth.uid()::text = user_id);

-- 認証済みユーザーが自分のデータのみ追加可能
CREATE POLICY "ユーザーは自分のタイマーデータのみ追加可能" 
  ON timer_data FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

-- 認証済みユーザーが自分のデータのみ更新可能
CREATE POLICY "ユーザーは自分のタイマーデータのみ更新可能" 
  ON timer_data FOR UPDATE 
  USING (auth.uid()::text = user_id);

-- 認証済みユーザーが自分のデータのみ削除可能
CREATE POLICY "ユーザーは自分のタイマーデータのみ削除可能" 
  ON timer_data FOR DELETE 
  USING (auth.uid()::text = user_id);
*/