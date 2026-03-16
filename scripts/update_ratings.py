"""
update_ratings.py
-----------------
月1回 GitHub Actions から実行され、camps.json の
reviews（口コミ数）と rating（評価）を Google Places API で更新するスクリプト。

【無料枠の試算】
- 使用 SKU : Place Details (Basic) → 月 5,000 回まで無料（2025年3月以降）
- camps.json が 200 件以下なら月1回実行でも無料枠内に収まる。
- place_id を camps.json に保存しておくことで Text Search（有料）を毎回叩かずに済む。

【初回セットアップ】
1. Google Cloud Console で Places API を有効化し API キーを取得
2. GitHub リポジトリの Settings > Secrets > Actions に
   GOOGLE_MAPS_API_KEY という名前で登録
3. 初回だけ place_id が空のキャンプ場は Text Search で自動補完される
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse

API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")
CAMPS_JSON = os.path.join(os.path.dirname(__file__), "..", "camps.json")

# ---- Place Details で rating / user_ratings_total を取得 ----
def fetch_details(place_id: str) -> dict | None:
    url = (
        "https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={urllib.parse.quote(place_id)}"
        "&fields=rating,user_ratings_total"
        f"&key={API_KEY}"
        "&language=ja"
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as res:
            data = json.loads(res.read())
        if data.get("status") == "OK":
            return data.get("result", {})
    except Exception as e:
        print(f"  [ERROR] fetch_details({place_id}): {e}")
    return None

# ---- Text Search で place_id を検索（初回のみ） ----
def search_place_id(name: str, prefecture: str) -> str | None:
    query = urllib.parse.quote(f"{prefecture} {name} キャンプ場")
    url = (
        "https://maps.googleapis.com/maps/api/place/textsearch/json"
        f"?query={query}"
        "&language=ja"
        f"&key={API_KEY}"
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as res:
            data = json.loads(res.read())
        results = data.get("results", [])
        if results:
            return results[0].get("place_id")
    except Exception as e:
        print(f"  [ERROR] search_place_id({name}): {e}")
    return None

# ---- メイン処理 ----
def main():
    if not API_KEY:
        print("ERROR: GOOGLE_MAPS_API_KEY が設定されていません。")
        sys.exit(1)

    with open(CAMPS_JSON, encoding="utf-8") as f:
        camps = json.load(f)

    updated = 0
    for camp in camps:
        name = camp.get("name", "")
        pref = camp.get("prefecture", "")
        print(f"処理中: {name}（{pref}）")

        # place_id がなければ Text Search で取得（初回のみ発生）
        if not camp.get("place_id"):
            pid = search_place_id(name, pref)
            if pid:
                camp["place_id"] = pid
                print(f"  place_id 取得: {pid}")
            else:
                print(f"  place_id が見つかりませんでした。スキップ。")
                time.sleep(0.5)
                continue
            time.sleep(0.3)  # レート制限対策

        # Place Details で最新データ取得
        details = fetch_details(camp["place_id"])
        if details:
            new_rating  = details.get("rating")
            new_reviews = details.get("user_ratings_total")
            if new_rating  is not None:
                camp["rating"]  = round(new_rating, 1)
            if new_reviews is not None:
                camp["reviews"] = new_reviews
            print(f"  更新: 評価={camp['rating']} 口コミ={camp['reviews']}")
            updated += 1
        else:
            print(f"  詳細取得失敗。既存データを維持。")

        # Googleマップリンクを place_id ベースに更新
        if camp.get("place_id"):
            camp["map"] = f"https://maps.google.com/?cid=&q=place_id:{camp['place_id']}"

        time.sleep(0.3)  # レート制限対策

    # 書き戻し
    with open(CAMPS_JSON, "w", encoding="utf-8") as f:
        json.dump(camps, f, ensure_ascii=False, indent=2)

    print(f"\n完了: {updated}/{len(camps)} 件を更新しました。")

if __name__ == "__main__":
    main()
