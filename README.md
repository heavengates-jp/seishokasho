# 今日の聖書箇所 PWA (React + Firebase + Supabase)

ブラウザ/スマホから「今日の聖書箇所」を閲覧でき、管理者がメール+パスワードで投稿・削除・添付アップロードできる PWA です。添付は PDF/画像/テキストに加え、ZIP をアップロードするとブラウザ内で解凍して Supabase Storage に展開します。

## スタック
- Vite + React + TypeScript + React Router
- Firebase: Authentication（Email/Password）, Firestore（verses コレクション）
- Supabase: Storage (attachments バケット, Public 読み取り)
- PWA: manifest + custom service worker（直近閲覧の Today/History をキャッシュ）
- GitHub Actions + GitHub Pages デプロイ

## 環境変数（.env / GitHub Secrets）
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=   # 不使用なら空で可
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_BASE_PATH=/seishokasho/
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_BUCKET=attachments
```

## セットアップ手順
1. 依存インストール  
   ```powershell
   npm ci
   ```
2. Firebase  
   - Authentication: Email/Password を有効化し、管理者ユーザーを作成。  
   - Firestore: データベースを作成（例: asia-northeast1）、コレクション `verses` を使用。  
   - ルールを「Firestore ルール例」に差し替えて公開。  
3. Supabase（無料枠）  
   - プロジェクトを作成し `Project URL` と `Publishable (anon) key` を控える。  
   - Storage: `attachments` バケットを Public で作成。  
   - ポリシー例（簡易運用）: anon で `insert/update` を許可。厳格にする場合は Firebase ID トークンを検証するプロキシを用意してください。
4. `.env` を作成し上記値を設定。GitHub Secrets も同名で登録。  
5. ローカル確認  
   ```powershell
   npm run dev
   npm run build
   ```
6. デプロイ  
   - GitHub Settings → Pages → Source を「GitHub Actions」に設定。  
   - `main` に push すると `deploy.yml` が走り、`https://heavengates-jp.github.io/seishokasho/` に公開。

## 画面
- `/` 今日の聖書箇所（未登録なら最新 or 「未登録」）。外部リンク（prs.app / bible.com）付き。
- `/history` 履歴一覧（日時・曜日表示、日付範囲/語句フィルタ）。
- `/history/:date` 指定日の詳細。
- `/admin/login` 管理者ログイン（Email/Password）。
- `/admin` 投稿・履歴削除（認証必須）。添付は PDF/画像/テキスト/ZIP 対応。ZIP はブラウザで解凍し、中身を個別ファイルとして Supabase にアップロードしてリンク化します。

## データモデル (Firestore `verses`)
```json
{
  "date": "2026-01-05",   // docID に合わせる
  "weekday": "月",
  "reference": "ヨハネ3:16",
  "comment": "メモ（任意）",
  "attachments": [
    { "url": "https://...", "type": "pdf", "name": "資料.pdf" },
    { "url": "https://...", "type": "image", "name": "photo.jpg" }
  ],
  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}
```
（互換のため `attachment` がある場合は `attachments` にも反映します）

## ルール例
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

Supabase Storage（簡易ポリシー例: anon でもアップロード可。URLを知ると誰でも書き込めるので本番は厳格化推奨）:
```sql
create policy "anon can upload attachments"
on storage.objects for insert
with check (bucket_id = 'attachments');

create policy "anon can update attachments"
on storage.objects for update
using (bucket_id = 'attachments');
```

## 受け入れ要件メモ
- 管理者のみ投稿/削除: Firebase Auth + Firestore ルール、UI もガード。
- 公開閲覧: `/` `/history` `/history/:date` は未ログインOK。
- 日付+曜日表示・検索: 履歴一覧で範囲/語句フィルタを実装。
- 添付: Supabase Storage。ZIP はブラウザで解凍して個別ファイルとしてアップロード。
- PWA: manifest + SW でキャッシュ表示。
- GitHub Actions: `deploy.yml` で自動デプロイ。
