# 今日の聖書箇所 PWA (React + Firebase)

ブラウザ/スマホから「今日の聖書箇所」を閲覧できる公開サイトです。管理者（ホスト）のみメール+パスワードでログインし、本文参照とコメント、添付資料（PDF/画像）の公開・削除が行えます。GitHub Pages に静的デプロイする前提で PWA（オフライン再表示対応）にしています。

## 技術スタック
- Vite + React + TypeScript + React Router
- Firebase: Authentication（Email/Password）, Firestore, Storage
- PWA: `manifest.webmanifest` + カスタム Service Worker（直近閲覧データのキャッシュ表示）
- GitHub Actions で `gh-pages` ブランチへデプロイ

## フォルダ構成
```
src/
  components/   UI 共通パーツ（Layout, VerseCard など）
  contexts/     AuthProvider（Firebase Auth 状態）
  lib/          firebase 初期化、firestore/storage 操作、型
  pages/        画面: Home, History, HistoryDetail, AdminLogin, AdminDashboard
public/
  manifest.webmanifest
  service-worker.js
  icons/        PWA アイコン (192/512/maskable)
.github/workflows/deploy.yml   GitHub Pages デプロイ
.env.example                   Firebase 環境変数のテンプレート
```

## セットアップ手順
1. 依存インストール
   ```powershell
   npm install
   ```
2. Firebase プロジェクトを作成し Web アプリを追加。`構成` から下記値を取得して `.env` を作る（`.env.example` をコピー）。
   ```env
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   # GitHub Pages のリポジトリ名配下に置く場合は "/<repo-name>/"
   VITE_BASE_PATH=/
   ```
3. Firebase の有効化
   - Authentication: Email/Password を有効化し、管理者用ユーザーを 1 つ作成。
   - Firestore: 本番モード/テストモードどちらでも可。コレクション `verses`（DocumentID は `yyyy-mm-dd` 推奨）。
   - Storage: デフォルトバケットを有効化（添付ファイル用）。
4. ローカル起動
   ```powershell
   npm run dev
   ```
5. 本番ビルド
   ```powershell
   npm run build
   ```

## 画面と動作
- `/` 今日の聖書箇所（未登録の場合は最新 or 「未登録」表示）。外部リンク（prs.app 検索 / bible.com 検索）付き。
- `/history` 履歴一覧（日時・曜日表示、日付範囲と語句検索フィルタ）。
- `/history/:date` 指定日の詳細。
- `/admin/login` 管理者ログイン（Email/Password）。
- `/admin` 投稿・履歴削除（認証必須）。

### データモデル（Firestore `verses` コレクション）
```json
{
  "date": "2026-01-05",   // docID に合わせる
  "weekday": "月",
  "reference": "ヨハネ3:16",
  "comment": "メモ（任意）",
  "attachment": {         // 任意
    "url": "https://...",
    "type": "pdf" | "image",
    "name": "資料.pdf"
  },
  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}
```

### PWA / オフライン
- `manifest.webmanifest` + `service-worker.js` でアイコン/静的ファイルをプリキャッシュ。
- 直近閲覧の「今日」「履歴一覧」を `localStorage` に保存。ネットワーク不通時はキャッシュした内容を表示。
- GitHub Pages 配下でも動作するよう `BASE_URL` / `VITE_BASE_PATH` に対応。

## Firebase セキュリティルール（例）
管理者のみ書き込み・削除を許可する例です。管理者判定はカスタムクレーム `admin: true` を付与したユーザーを想定しています（Firebase Admin SDK で付与）。

Firestore:
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    match /verses/{date} {
      allow read: if true;            // 公開読み取り
      allow create, update, delete: if isAdmin();
    }
  }
}
```

Storage:
```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    match /attachments/{allPaths=**} {
      allow read: if true;   // 公開閲覧
      allow write: if isAdmin();
    }
  }
}
```

### 管理者クレームの付与（参考コード）
```ts
// Node.js + Admin SDK 例
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

initializeApp({ credential: applicationDefault() })
await getAuth().setCustomUserClaims('<ADMIN_UID>', { admin: true })
```

## GitHub Actions / GitHub Pages デプロイ
1. リポジトリ Secrets に Firebase の値を登録（`VITE_FIREBASE_API_KEY` など、.env と同名で OK）。
2. `Settings > Pages` で Source を「GitHub Actions」に設定。
3. `main` ブランチに push すると `deploy.yml` が走り、`dist` を Pages に公開します。`VITE_BASE_PATH` はリポジトリ名に自動設定しています。

## 受け入れ要件への対応
- 管理者のみ投稿/削除: Firebase Auth + Firestore/Storage ルール例を提示、UI も認証必須に。
- 公開閲覧: `/` / `/history` / `/history/:date` は未ログインで閲覧可能。
- 日付+曜日表示とフィルタ: 履歴一覧で日付・曜日を表示し、範囲/語句検索フィルタを実装。
- 添付資料: 管理画面から Storage にアップロードし、ユーザー側でリンク表示。
- PWA: manifest + service worker、直近閲覧データをキャッシュしてオフライン再表示。
- GitHub Actions: `deploy.yml` でビルド→Pages へ自動デプロイ。
