# SkillMap AI

テーマからAIスキルマップを生成し、保存、編集、検索、学習進捗管理まで行うNext.js App Router製のMVPです。

## 主な機能

- Supabase AuthによるGoogleログイン
- テーマ入力からスキルマップJSONを生成
- React Flowによるマップ表示
- ノード詳細、Markdown表示、タグ表示
- ノード追加、編集、削除、親固定、接続開始点固定
- 関連線の追加、削除
- 4方向自動整列
- 保存済みマップ一覧、名前変更、削除
- 学習状態管理と進捗率表示
- タイトル、説明のマップ内検索

## 技術スタック

- Next.js App Router
- React / TypeScript
- Tailwind CSS / shadcn/ui
- React Flow
- Supabase Auth
- PostgreSQL / Prisma
- OpenAI API

## セットアップ

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm dev
```

`.env` には実際の値を設定してください。`.env` はGit管理しません。

## 環境変数

必須:

```env
DATABASE_URL=""
DIRECT_URL=""
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
SKILLMAP_GENERATOR_MODE="mock"
```

OpenAI生成を使う場合:

```env
SKILLMAP_GENERATOR_MODE="openai"
OPENAI_API_KEY=""
OPENAI_MODEL=""
```

DB接続確認スクリプトを使う場合:

```env
CHECK_USER_ID=""
```

注意:

- `OPENAI_API_KEY` に `NEXT_PUBLIC_` を付けないでください。
- `DATABASE_URL` はアプリ実行用、`DIRECT_URL` はPrisma Migration用です。
- Supabase Service Role Keyは通常のアプリ実行では不要です。

## 開発用コマンド

```bash
pnpm prisma validate
pnpm prisma:deploy
pnpm prisma migrate status
pnpm db:check
pnpm lint
pnpm build
```

## 本番公開前チェック

1. Supabase AuthenticationのSite URLを本番URLに設定する。
2. Supabase AuthenticationのRedirect URLsに以下を登録する。
   - `https://<your-domain>/auth/callback`
   - ローカル確認用に `http://localhost:3000/auth/callback`
3. Vercelに環境変数を登録する。
4. 本番DBへMigrationを適用する。

```bash
pnpm prisma:deploy
pnpm prisma migrate status
```

5. OpenAI生成へ切り替える場合は `SKILLMAP_GENERATOR_MODE="openai"` を設定する。
6. 本番で以下を総合確認する。
   - Googleログイン、ログアウト
   - AI生成
   - 保存、再表示
   - ノード編集、座標保存、関連線
   - 学習状態保存
   - 検索
   - スマホ表示

## Prisma

Supabaseの `auth` / `storage` スキーマはPrisma管理対象にしていません。アプリ側のpublicテーブルのみMigrationで管理します。

## 生成モード

開発中はOpenAI APIを呼び出さず、モック生成を使えます。

```env
SKILLMAP_GENERATOR_MODE="mock"
```

公開前または本番検証時にOpenAI生成へ切り替えます。

```env
SKILLMAP_GENERATOR_MODE="openai"
```
