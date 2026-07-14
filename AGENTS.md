# AGENTS.md

# AIスキルマップ MVP 開発ガイド

## 1. プロジェクト概要

本プロジェクトは、AIが自動生成したスキルマップを利用して学習できるWebアプリケーションを開発する。

本MVPでは、

> 「テーマを入力するとAIがスキルマップを生成し、そのまま学習できる」

という体験を実現することを目的とする。

これは完成版ではなく、2週間で公開できるMinimum Viable Product（MVP）である。

---

# 2. MVPのゴール

ユーザーは

```text
Linux スキルマップ
```

のようなテーマを入力する。

↓

AIが学習ロードマップをJSONで生成する。

↓

React Flowでマインドマップ表示する。

↓

ノードをクリックすると解説を見る。

↓

学習済みを付けられる。

これをMVPの完成条件とする。

---

# 3. 今回実装する機能

## 3.1 AIスキルマップ生成

トップページに入力フォームを設置する。

例

```text
Linux スキルマップ

AWS SAA

高校世界史

高校数学Ⅰ

Python 初学者
```

入力内容をOpenAI APIへ送信し、

階層構造のJSONを生成する。

---

## 3.2 React Flow表示

AIが生成したJSONをReact Flowへ変換し表示する。

対応する機能

- ズーム
- パン
- Fit View
- ノードクリック

ドラッグ編集はMVPでは不要。

---

## 3.3 ノード詳細

クリックすると

- タイトル
- 説明
- タグ

を表示する。

Markdown表示に対応する。

---

## 3.4 学習ステータス

各ノードは

- 未学習
- 学習中
- 学習済み

の3種類のみ。

クリックで変更できる。

---

## 3.5 マイマップ保存

AI生成したマップはユーザーごとに保存する。

後から再編集できる。

---

## 3.6 リスト表示

React Flowとは別に

スマホ向けアコーディオン表示を実装する。

ボタン一つで切り替え可能。

---

## 3.7 検索

現在開いているスキルマップ内だけ検索する。

対象

- タイトル
- 説明

タグ検索は後回し。

---

# 4. 実装しない機能

以下はMVPでは実装しない。

- Xmindインポート
- PDFインポート
- AI苦手分析
- AI学習計画
- 数学専用KaTeX
- 世界史地図
- Resource管理
- NodeVersion
- Organization
- 法人管理
- 権限管理
- コメント
- ノート
- バッジ
- ダッシュボード分析

---

# 5. 技術スタック

Frontend

- Next.js(App Router)
- React
- TypeScript

UI

- Tailwind CSS
- shadcn/ui

マインドマップ

- React Flow

Backend

- Supabase

Database

- PostgreSQL
- Prisma

認証

- Supabase Auth（Googleログインのみ）

AI

- OpenAI API

---

# 6. データ設計

今回は必要最小限とする。

## User

Supabase Authを利用。

---

## SkillMap

ユーザーが生成したマップ。

```prisma
id
title
prompt
userId
createdAt
```

---

## Node

```prisma
id
skillMapId
parentId
title
description
order
tags(Json)
```

---

## UserNodeProgress

```prisma
id
userId
nodeId
status
updatedAt
```

status

- NOT_STARTED
- LEARNING
- COMPLETED

---

# 7. AI生成仕様

OpenAI APIへ送信する。

AIには

JSONのみ返却させる。

構造

```json
{
  "title": "Linux",
  "description": "...",
  "children": [
    {
      "title": "基本操作",
      "description": "...",
      "children": []
    }
  ]
}
```

各Nodeには

- title
- description

必須。

tagsは任意。

JSONがパースできない形式は禁止。

---

# 8. UI方針

画面数は最小限。

画面一覧

- ホーム
- スキルマップ
- マイページ

のみ。

レスポンシブ対応。

ダークモード対応。

---

# 9. React Flow方針

React Flowを利用する。

ノード編集は実装しない。

閲覧を優先する。

React Flowは

AIが生成したJSONを表示するビューアとして扱う。

---

# 10. 開発ルール

TypeScript strict mode

App Routerのみ使用

Pages Router禁止

Server Components優先

Client Components最小限

ESLintエラーゼロ

any禁止

ハードコード禁止

コンポーネントは再利用可能に設計する。

---

# 11. AIとの役割分担

AIが担当

- スキルマップ生成
- ノード説明生成

アプリ側が担当

- 保存
- 表示
- 検索
- 学習管理

AIに学習進捗は持たせない。

---

# 12. 今回の完成条件

以下がすべて動作すればMVP完成とする。

✅ Googleログイン

✅ テーマ入力

✅ AIがJSON生成

✅ React Flow表示

✅ ノード詳細表示

✅ 学習状態保存

✅ マイマップ一覧

公開可能な品質であることを優先し、機能追加よりも安定性・使いやすさを重視する。

---

# 13. 2週間（10営業日）開発スケジュール

## Day 1：プロジェクトセットアップ・設計

目標: 開発環境を構築し、最初の画面を表示できる状態にする。

タスク:

- Next.js(App Router)作成
- TypeScript strict mode確認
- Tailwind CSS導入
- shadcn/ui導入
- React Flow導入
- Prisma導入
- Supabaseプロジェクト作成
- GitHubリポジトリ作成
- Vercel連携
- ESLint・Prettier設定

成果物:

- 「Hello World」がデプロイ済み
- 開発環境が完成

## Day 2：認証・データベース

目標: ログインできる状態にする。

タスク:

- Supabase Auth
- Googleログイン
- Prismaスキーマ作成
- SkillMapテーブル
- Nodeテーブル
- UserNodeProgressテーブル
- マイグレーション

成果物:

- Googleログイン成功
- DBへ接続

## Day 3：AI生成API

目標: テーマからJSONを取得する。

タスク:

- 入力画面作成
- OpenAI API呼び出し
- プロンプト作成
- JSONパース
- エラー処理

成果物:

- 入力からJSON取得まで完成

## Day 4：React Flow表示

目標: JSONをマップ化する。

タスク:

- JSONからReact Flowへの変換
- ノード生成
- エッジ生成
- Fit View
- ズーム
- パン

成果物:

- AI生成結果がマップ表示される

## Day 5：保存機能

目標: 生成したマップを保存する。

タスク:

- SkillMap保存
- Node保存
- 一覧画面
- 再読み込み

成果物:

- AI生成、保存、一覧、再表示が完成

## Day 6：ノード詳細・リスト表示

目標: マップを読む体験を作る。

タスク:

- ノードクリック
- Drawer表示
- Markdown表示
- アコーディオンリスト
- マップ切替

成果物:

- PC・スマホ両対応

## Day 7：学習管理

目標: 学習アプリとして成立させる。

タスク:

- 未学習
- 学習中
- 習得済み
- DB保存
- 色変更
- 進捗率計算

成果物:

- 学習状態が保存される

## Day 8：検索

目標: ノード検索を実装する。

タスク:

- タイトル検索
- 説明検索
- 検索結果ハイライト
- 検索中ノードへ移動

成果物:

- マップ内検索完成

## Day 9：UI改善・レスポンシブ

目標: 公開できる品質へ高める。

タスク:

- スマホ対応
- ダークモード
- ローディング
- エラー表示
- 空画面対応
- デザイン調整

成果物:

- MVPらしい完成度

## Day 10：仕上げ・公開

目標: リリースする。

タスク:

- ESLint
- 型エラー修正
- 不要コード削除
- README
- 環境変数整理
- Vercelデプロイ
- 動作確認

成果物:

- 一般公開可能

## 完成時の画面一覧

- ホーム: テーマ入力、AI生成
- スキルマップ: React Flow表示
- ノード詳細: 説明、タグ、学習状態
- マイマップ一覧: 生成済みマップ
- プロフィール: ログアウト

## MVPではやらないこと

- Xmindインポート
- PDFインポート
- ノード編集（ドラッグ・追加・削除）
- AIによる苦手分析・学習計画
- タグの複合検索
- 数学（KaTeX）
- 世界史（地図・年表）
- Linux専用コンポーネント
- Organization・企業向け機能
- Resource管理
- NodeVersion
- 通知・コメント・ノート

## Definition of Done

- Googleアカウントでサインインできる
- テーマ入力からJSON形式のスキルマップが生成される
- React Flowで階層構造が表示される
- 生成したスキルマップを保存・再表示できる
- ノードごとに「未学習・学習中・習得済み」を記録できる
- 現在のスキルマップ内でタイトル・説明を検索できる
- PC・スマートフォンの両方で利用できる
- Vercel上で第三者がアクセスできる
