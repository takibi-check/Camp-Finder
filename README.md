# キャンプ場発掘ツール

東日本の穴場キャンプ場を発掘するためのPWA対応Webアプリです。  
口コミ数・評価・開設期間でフィルタリングし、地図上に表示します。

---

## 公開手順（初回のみ・約15分）

### Step 1 : GitHubにリポジトリを作成してアップロード

1. [GitHub](https://github.com) にログインし、**New repository** をクリック
2. リポジトリ名を `camp-finder` にして **Create repository**
3. このフォルダの中身をすべてアップロード（ドラッグ＆ドロップ可）

### Step 2 : Netlifyで公開

1. [Netlify](https://netlify.com) にログイン（GitHubアカウントで可）
2. **Add new site → Import an existing project → GitHub** を選択
3. `camp-finder` リポジトリを選択 → **Deploy site**
4. 数秒で `https://xxxxx.netlify.app` のURLが発行される

### Step 3 : 口コミ自動更新の設定（任意）

口コミ数・評価をGoogle Mapsの実データで月1回自動更新したい場合：

1. [Google Cloud Console](https://console.cloud.google.com/) で **Places API** を有効化
2. APIキーを発行（無料枠：月5,000リクエストまで0円）
3. GitHubリポジトリの **Settings → Secrets and variables → Actions** を開く
4. **New repository secret** をクリック
   - Name: `GOOGLE_MAPS_API_KEY`
   - Secret: 発行したAPIキー
5. 設定完了。毎月1日 午前9時に自動実行されます

> **手動実行したい場合：**  
> GitHubリポジトリの **Actions → 月次口コミ・評価自動更新 → Run workflow** をクリック

---

## ファイル構成

```
camp-finder/
├── index.html              # メインHTML
├── style.css               # デザイン（モバイルファースト）
├── app.js                  # 地図・フィルター・カード表示ロジック
├── camps.json              # キャンプ場データ（52件）
├── manifest.json           # PWA設定
├── sw.js                   # Service Worker（オフライン対応）
├── icon-192.png            # PWAアイコン
├── icon-512.png            # PWAアイコン
├── scripts/
│   └── update_ratings.py   # 口コミ自動更新スクリプト
└── .github/
    └── workflows/
        └── update_ratings.yml  # GitHub Actions設定（月1回自動実行）
```

---

## キャンプ場データの追加方法

`camps.json` に以下の形式で追記するだけで反映されます：

```json
{
  "name": "キャンプ場名",
  "prefecture": "都道府県名",
  "description": "一言説明",
  "lat": 35.123,
  "lng": 138.456,
  "reviews": 3,
  "rating": 4.5,
  "open": 2023,
  "map": "https://maps.google.com/?q=キャンプ場名",
  "place_id": ""
}
```

`place_id` は空欄でOKです。初回の自動更新時にGoogleマップから自動取得されます。

---

## フィルター機能

| フィルター | 内容 |
|---|---|
| 都道府県 | 18都道府県から絞り込み |
| 口コミ上限 | 指定件数以下の穴場を抽出 |
| 並び順 | 口コミ少ない順 / 多い順 / 評価高い順 |
| 開設からの期間 | 今日から1〜10年以内に開設されたキャンプ場を絞り込み |

---

## 技術スタック

- **地図**: Leaflet.js + OpenStreetMap (CARTO Voyager)
- **データ更新**: Python + Google Places API + GitHub Actions
- **ホスティング**: Netlify（無料）
- **PWA**: manifest.json + Service Worker
